import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing imageBase64 or mimeType' });
    }

    // Remove the data URI part if it exists
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Analyze the food in this image with high precision. 1. Identify all food components. 2. Estimate the realistic portion size and weight for each item by comparing it to standard typical serving sizes (e.g., a standard burger is ~200-250g, a standard cutlet is ~100-150g). 3. Calculate the total calories, protein, carbs, and fat based on standard verified nutritional database values for these specific estimated weights. 4. Ensure the total calories mathematically match the macronutrients closely (Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g). 5. Provide the name of the dish and a short description that mentions the estimated weight. If the image does not seem to contain food, return "calories": 0, "foodName": "Не еда", and provide a relevant description. All text responses (foodName, description) MUST be in Russian language.',
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING },
            calories: { type: Type.INTEGER },
            protein: { type: Type.INTEGER },
            carbs: { type: Type.INTEGER },
            fat: { type: Type.INTEGER },
            description: { type: Type.STRING },
          },
          required: ['foodName', 'calories', 'protein', 'carbs', 'fat', 'description'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No response text from Gemini');
    }

    const nutritionalInfo = JSON.parse(text);
    return res.status(200).json(nutritionalInfo);

  } catch (error: any) {
    console.error('Error analyzing image:', error);
    
    let errorMessage = error.message || 'Внутренняя ошибка сервера';
    let statusCode = 500;
    
    if (error.status === 429 || (error.message && (error.message.includes('429') || error.message.includes('Quota')))) {
      errorMessage = 'Превышен бесплатный лимит запросов (5 в минуту). Пожалуйста, подождите минуту и попробуйте снова.';
      statusCode = 429;
    }
    
    return res.status(statusCode).json({ error: errorMessage });
  }
}
