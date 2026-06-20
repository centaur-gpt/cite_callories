import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.post('/api/analyze-food', async (req, res) => {
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
      res.json(nutritionalInfo);

    } catch (error: any) {
      console.error('Error analyzing image:', error);
      
      let errorMessage = error.message || 'Внутренняя ошибка сервера';
      let statusCode = 500;
      
      if (error.status === 429 || (error.message && (error.message.includes('429') || error.message.includes('Quota')))) {
        errorMessage = 'Превышен бесплатный лимит запросов (5 в минуту). Пожалуйста, подождите минуту и попробуйте снова.';
        statusCode = 429;
      }
      
      res.status(statusCode).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
