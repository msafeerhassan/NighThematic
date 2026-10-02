const promptInput = document.getElementById('promptInput');
const genBtn = document.getElementById('genBtn');
const charCount = document.getElementById('charCount');
const statusElement = document.getElementById('status');
const resultImg = document.getElementById('resultImg');
const errorMsg = document.getElementById('errorMsg');

function updateCharCount() {
    charCount.textContent = `${promptInput.value.length} / 300`;
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.hidden = false;
}

function clearError() {
    errorMsg.hidden = true;
    errorMsg.textContent = '';
}

function showImg(base64Url) {
    resultImg.src = base64Url;
    resultImg.hidden = false;
}

async function genImg() {
    const prompt = promptInput.value.trim();

    if(!prompt) {
        showError('Please enter the description :(');
        return;
    }

    clearError();

    resultImg.hidden = true;
    genBtn.disabled = true;

    statusElement.textContent = 'Cooking... (wait for 10-20 seconds)';

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify( { prompt } )
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.error || "It got cooked at 1000 degrees :(. Please try again.");
        }

        showImg(data.image);
    } catch (error) {
        showError("Oven is working. Please try again :(");
    } finally {
        genBtn.disabled = false;
        statusElement.textContent = '';
    }
}

promptInput.addEventListener('input', updateCharCount);

promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        genImg();
    }
});

genBtn.addEventListener('click', genImg);