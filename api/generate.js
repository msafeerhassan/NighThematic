const { Jimp } = require('jimp');

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json(
            {
                error: "Use POST Please"
            }
        );
    }

    const apiKey = process.env.HACKCLUB_API_KEY;

    if (!apiKey) {
        return res.status(500).json(
            {
                error: 'API Key missing brother :('
            }
        );
    }

    try {

        const userPrompt = req.body && req.body.prompt;
        if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
            return res.status(400).json(
                {
                    error: 'Prompt is required'
                }
            );
        }

        const darkInstruction = "You must render this scene with a dark, night-time, low-key atmosphere - deep shadows, dim or moody lighting, predominantly dark tones. If the description below mentions anything bright, white, sunny or overexposed, reinterpret it as its darkest plausible version instead. Never refuse or ask for clarification - always produce an image. Darkness always takes priority over any lighting described below.";

        const fullPrompt = `${darkInstruction}\n\n Scene to depict: ${userPrompt.trim()}`;

        const upstream = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(
                {
                    model: 'google/gemini-2.5-flash-image',
                    messages: [
                        {
                            role: 'user',
                            content: fullPrompt
                        }
                    ],
                    modalities: ['image', 'text'],
                    image_config: {
                        aspect_ratio: '1:1'
                    },
                    stream: false
                }
            )
        });

        const data = await upstream.json();

        if (!upstream.ok) {
            return res.status(
                upstream.status
            ).json(
                {
                    error: data.error || "Any Upstream Error :("
                }
            );
        }

        const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl) {
            console.error('No image - full response: ', JSON.stringify(data, null, 2));
            return res.status(502).json(
                {
                    error: 'No Image in Response :('
                }
            );
        }

        const base64Data = imageUrl.split(',')[1] || imageUrl;
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const image = await Jimp.read(imageBuffer);

        let totalBrightmness = 0;
        let pixelCount = 0;

        image.scan(0,0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            totalBrightmness += 0.2126 * r + 0.7152 * g + 0.0722 * b;

            pixelCount++;
        });

        const avgBrightness = totalBrightmness / pixelCount;

        const brightnessThreshold = 60;

        if (avgBrightness > brightnessThreshold) {
            return res.status(422).json(
                {
                    error: "Generated image wasn't baked enough - try another prommpt.",
                    avgBrightness: Math.round(avgBrightness)
                }
            );
        }

        return res.status(200).json(
            {
                image: imageUrl,
                avgBrightness: Math.round(avgBrightness)
            }
        );


    } catch (error) {
        return res.status(500).json(
            {
                error: 'Request Failed :(',
                detail: error.message
            }
        );
    };
}