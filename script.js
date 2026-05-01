const defaultCode = `for(int i=1;i<n-1;i++){\n    a[i] = a[i-1] + b[i];\n    x[i] = y[i+1] + z[i];\n    c[i] = d[i] * e[i];\n}`;

const codeInput = document.getElementById('codeInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('resetBtn');
const analysisUI = document.getElementById('analysisUI');
const spotlightCode = document.getElementById('spotlightCode');
const stepsList = document.getElementById('stepsList');
const resultsContainer = document.getElementById('resultsContainer');
const resultBox = document.getElementById('resultBox');
const generatedCode = document.getElementById('generatedCode');

codeInput.value = defaultCode;

analyzeBtn.addEventListener('click', () => {
    runAnalysis(codeInput.value);
});

resetBtn.addEventListener('click', () => {
    codeInput.value = defaultCode;
    analysisUI.style.display = 'none';
    analyzeBtn.disabled = false;
    codeInput.disabled = false;
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAnalysis(code) {
    analyzeBtn.disabled = true;
    codeInput.disabled = true;
    
    // Reset UI states
    analysisUI.style.display = 'block';
    resultsContainer.style.display = 'none';
    stepsList.innerHTML = '';
    spotlightCode.textContent = 'Initializing Analysis...';
    spotlightCode.classList.remove('spotlight-active');
    
    await sleep(600); // Wait for UI to show
    
    // Simple Line Parser
    const lines = code.split('\n').filter(l => l.trim() !== '');
    
    let loopHeader = "";
    let loopBodyLines = [];
    
    for (let line of lines) {
        if (line.trim().startsWith("for")) {
            loopHeader = line.trim();
        } else if (line.trim() !== "}") {
            loopBodyLines.push(line.trim());
        }
    }
    
    if(!loopHeader.endsWith("{")) {
        loopHeader += "{";
    }

    const depLines = [];
    const indepLines = [];
    
    spotlightCode.classList.add('spotlight-active');

    // Analyze each line iteratively with visualization padding
    for (let i = 0; i < loopBodyLines.length; i++) {
        const line = loopBodyLines[i];
        
        // 1. Show in spotlight
        spotlightCode.innerHTML = `${escapeHtml(line)}`;
        
        // Natural reading delay
        await sleep(1200); 
        
        // 2. Perform Detection Rules
        // Backward / Forward dependence check
        const isDependent = /\[\s*i\s*-\s*\d+\s*\]/.test(line) || /\[\s*i\s*\+\s*\d+\s*\]/.test(line);
        
        // 3. Build the animated UI Step
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-item';
        
        // The main status text
        const stepMain = document.createElement('div');
        stepMain.className = 'step-main';
        
        // The educational explanation text
        const stepExplanation = document.createElement('div');
        stepExplanation.className = 'step-explanation';
        
        if (isDependent) {
            stepDiv.classList.add('step-dep');
            stepMain.innerHTML = `<span class="icon">❌</span>Dependent &rightarrow; ${escapeHtml(line)}`;
            stepExplanation.innerHTML = `<em>Analysis:</em> Found a loop-carried dependency (e.g. <code>[i-1]</code> or <code>[i+1]</code>). Iteration <code>i</code> requires data from a different iteration, so it cannot be executed simultaneously.`;
            depLines.push(line);
        } else {
            stepDiv.classList.add('step-ind');
            stepMain.innerHTML = `<span class="icon">✅</span>Independent &rightarrow; ${escapeHtml(line)}`;
            stepExplanation.innerHTML = `<em>Analysis:</em> Array indices cleanly match <code>[i]</code>. Operations do not overlap across boundaries, making it safe to parallelize.`;
            indepLines.push(line);
        }
        
        stepDiv.appendChild(stepMain);
        stepDiv.appendChild(stepExplanation);
        stepsList.appendChild(stepDiv);
        
        // Brief pause before next line
        await sleep(400); 
    }

    // Done scanning
    spotlightCode.classList.remove('spotlight-active');
    spotlightCode.textContent = 'Loop distribution calculation complete.';
    
    await sleep(800);

    // Compute Result State
    let resultText = "";
    let resultClass = "";
    
    if (depLines.length > 0 && indepLines.length > 0) {
        resultText = `<span class="icon">⚠️</span> Partially Parallelizable`;
        resultClass = 'res-partial';
    } else if (depLines.length === 0 && indepLines.length > 0) {
        resultText = `<span class="icon">✅</span> Fully Parallelizable`;
        resultClass = 'res-full';
    } else {
        resultText = `<span class="icon">❌</span> Not Parallelizable`;
        resultClass = 'res-none';
    }
    
    resultBox.innerHTML = resultText;
    resultBox.className = `result-box ${resultClass}`;

    // Generate Code Splitting output
    let outHtml = `<span class="omp-comment">// Auto-generated loop distribution</span>\n\n`;

    if (depLines.length > 0) {
        outHtml += `<span class="omp-comment">// Sequential Part</span>\n`;
        outHtml += `<span style="color:#00ccff">${escapeHtml(loopHeader)}</span>\n`;
        depLines.forEach(l => {
            outHtml += `    <span style="color:#00ccff">${escapeHtml(l)}</span>\n`;
        });
        outHtml += `<span style="color:#00ccff">}</span>\n\n`;
    }

    if (indepLines.length > 0) {
        outHtml += `<span class="omp-comment">// Parallel Part</span>\n`;
        outHtml += `<span class="omp-pragma">#pragma omp parallel for</span>\n`;
        outHtml += `<span style="color:#00ccff">${escapeHtml(loopHeader)}</span>\n`;
        indepLines.forEach(l => {
            outHtml += `    <span style="color:#00ccff">${escapeHtml(l)}</span>\n`;
        });
        outHtml += `<span style="color:#00ccff">}</span>\n`;
    }

    generatedCode.innerHTML = outHtml;
    
    // Reveal Results Panel
    resultsContainer.style.display = 'block';
    
    analyzeBtn.disabled = false;
    codeInput.disabled = false;
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
