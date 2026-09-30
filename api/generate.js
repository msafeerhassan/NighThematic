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

        const darkSuffix = ', dark theme, night setting, moody lighting, deep shadows, low-key, black background MUST.';

        const fullPrompt = userPrompt.trim() + darkSuffix;

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
            return res.status(502).json(
                {
                    error: 'No Image in Response :('
                }
            );
        }

        return res.status(200).json(
            {
                image: imageUrl
            }
        );
    } catch (error) {
        return res.status(500).json(
            {
                error: 'Request Failed :('
            }
        );
    };
}