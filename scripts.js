let numLoops;
let numPipes;

function generateTables() {
    numLoops = parseInt(document.getElementById('numLoops').value);
    numPipes = parseInt(document.getElementById('numPipes').value);

    const resultTables = document.getElementById('resultTables');
    resultTables.innerHTML = '';

    for (let loop = 1; loop <= numLoops; loop++) {
        const loopTable = document.createElement('div');
        loopTable.classList.add('loop-table');
        let sharedColumnHeader = '';

        // Add the "Shared" column header if more than 1 loop
        if (numLoops > 1) {
            sharedColumnHeader = '<th class="shared-col">Shared</th>';
        }

        loopTable.innerHTML = `
            <h2>Loop ${loop}</h2>
            <table id="loop${loop}Table">
                <thead>
                    <tr>
                        ${sharedColumnHeader}
                        <th class="pipe-col">Pipe</th>
                        <th class="small-col">Diameter (m)</th>
                        <th class="small-col">Length (m)</th>
                        <th class="small-col">Initial Flow Rate (m³/s)</th>
                        <th class="large-col">K</th>
                        <th class="large-col">Q (m³/s)</th>
                        <th class="large-col">hf</th>
                        <th class="large-col">hf/Q</th>
                        <th class="large-col">ΔQ Correction</th>
                        <th class="large-col">Q Corrected</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateTableRows(numPipes, loop)}
                    <tr>
                        <td colspan="${numLoops > 1 ? 7 : 6}" class="sum-row"></td>
                        <td id="sumHf${loop}">Σhf = </td>
                        <td id="sumHfQ${loop}">Σhf/Q = </td>
                        <td></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
            <button type="button" onclick="calculateCorrections(${loop})">Calculate Corrections for Loop ${loop}</button>
            <button type="button" onclick="resetLoop(${loop})">Reset Loop ${loop}</button>
        `;
        resultTables.appendChild(loopTable);
    }
    drawVisualization();
}

function generateTableRows(numPipes, loop) {
    let rows = '';
    for (let i = 1; i <= numPipes; i++) {
        let checkboxColumn = '';
        if (numLoops > 1) {
            checkboxColumn = `<td><input type="checkbox" id="sharedPipe${loop}_${i}" onclick="syncCheckbox(${loop}, ${i})"></td>`;
        }

        rows += `
            <tr>
                ${checkboxColumn}
                <td><input type="number" value="${i}" disabled></td>
                <td><input type="number" step="0.01" id="diameter${loop}_${i}" oninput="updateValues(${loop}, ${i})" required></td>
                <td><input type="number" step="0.1" id="length${loop}_${i}" oninput="updateValues(${loop}, ${i})" required></td>
                <td><input type="number" step="0.0001" id="flow${loop}_${i}" oninput="updateValues(${loop}, ${i})" required></td>
                <td id="K${loop}_${i}" readonly></td>
                <td id="Q${loop}_${i}" readonly></td>
                <td id="hf${loop}_${i}" readonly></td>
                <td id="hfQ${loop}_${i}" readonly></td>
                <td id="deltaQ${loop}_${i}" readonly></td>
                <td id="correctedFlow${loop}_${i}" readonly></td>
            </tr>
        `;
    }
    return rows;
}

function syncCheckbox(loop, pipeIndex) {
    const checkbox = document.getElementById(`sharedPipe${loop}_${pipeIndex}`);
    const isChecked = checkbox.checked;

    // Sync with other loops
    for (let l = 1; l <= numLoops; l++) {
        if (l !== loop) {
            const otherCheckbox = document.getElementById(`sharedPipe${l}_${pipeIndex}`);
            if (otherCheckbox) {
                otherCheckbox.checked = isChecked;
            }
        }
    }
}

function updateValues(loop, index) {
    const diameter = parseFloat(document.getElementById(`diameter${loop}_${index}`).value);
    const length = parseFloat(document.getElementById(`length${loop}_${index}`).value);
    const flow = parseFloat(document.getElementById(`flow${loop}_${index}`).value);

    if (!isNaN(diameter) && !isNaN(length) && !isNaN(flow)) {
        const K = calculateK(diameter, length);
        const hf = calculateHeadLoss(K, flow);
        const hfQ = hf / flow;

        document.getElementById(`K${loop}_${index}`).innerText = K.toFixed(4);
        document.getElementById(`Q${loop}_${index}`).innerText = flow.toFixed(4);
        document.getElementById(`hf${loop}_${index}`).innerText = hf.toFixed(2);
        document.getElementById(`hfQ${loop}_${index}`).innerText = hfQ.toFixed(2);
    }
    drawVisualization();
}

function calculateCorrections(loop) {
    let otherLoop;
    if (loop === 1) {
        otherLoop = 2;
    } else if (loop === 2) {
        otherLoop = 1;
    }

    let allInputsFilled = true;

    // Check if inputs for both loops are filled
    if (numLoops > 1) {
        for (let l = 1; l <= numLoops; l++) {
            for (let i = 1; i <= numPipes; i++) {
                const diameter = document.getElementById(`diameter${l}_${i}`).value;
                const length = document.getElementById(`length${l}_${i}`).value;
                const flow = document.getElementById(`flow${l}_${i}`).value;

                if (diameter === '' || length === '' || flow === '') {
                    allInputsFilled = false;
                    break;
                }
            }
            if (!allInputsFilled) break;
        }
    } else {
        for (let i = 1; i <= numPipes; i++) {
            const diameter = document.getElementById(`diameter${loop}_${i}`).value;
            const length = document.getElementById(`length${loop}_${i}`).value;
            const flow = document.getElementById(`flow${loop}_${i}`).value;

            if (diameter === '' || length === '' || flow === '') {
                allInputsFilled = false;
                break;
            }
        }
    }

    if (!allInputsFilled) {
        alert(`Please fill in all inputs before calculating corrections for Loop ${loop}.`);
        return;
    }

    let sumHf = 0;
    let sumHfQ = 0;

    // Perform calculations if all inputs are filled
    for (let i = 1; i <= numPipes; i++) {
        const hf = parseFloat(document.getElementById(`hf${loop}_${i}`).innerText);
        const hfQ = parseFloat(document.getElementById(`hfQ${loop}_${i}`).innerText);

        if (!isNaN(hf)) {
            sumHf += hf;
        }

        if (!isNaN(hfQ)) {
            sumHfQ += hfQ;
        }
    }

    const deltaQ = -sumHf / sumHfQ;

    for (let i = 1; i <= numPipes; i++) {
        const isShared = document.getElementById(`sharedPipe${loop}_${i}`) ? document.getElementById(`sharedPipe${loop}_${i}`).checked : false;
        const deltaQOtherLoop = numLoops > 1 ? calculateDeltaQForOtherLoop(otherLoop) : 0;
        const deltaQForSharedPipe = isShared ? deltaQ - deltaQOtherLoop : deltaQ;

        document.getElementById(`deltaQ${loop}_${i}`).innerText = deltaQForSharedPipe.toFixed(4);
        document.getElementById(`correctedFlow${loop}_${i}`).innerText = (parseFloat(document.getElementById(`flow${loop}_${i}`).value) + deltaQForSharedPipe).toFixed(4);
    }

    // Update sums
    document.getElementById(`sumHf${loop}`).innerText = `Σhf = ${sumHf.toFixed(2)}`;
    document.getElementById(`sumHfQ${loop}`).innerText = `Σhf/Q = ${sumHfQ.toFixed(2)}`;

    // Start iteration
    iterate(loop);
    drawVisualization();
}

function drawVisualization() {
    const canvas = document.getElementById('visualizationCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 200;

    const angles = [];
    for (let i = 0; i < numPipes; i++) {
        angles.push((2 * Math.PI / numPipes) * i);
    }

    if (numPipes < 3 || numPipes > 6) {
        alert("Visualization model can only handle 3 to 6 pipes in a single loop.");
        return;
    }

    for (let i = 1; i <= numPipes; i++) {
        const nextIndex = (i % numPipes) + 1;

        const x1 = centerX + radius * Math.cos(angles[i - 1]);
        const y1 = centerY + radius * Math.sin(angles[i - 1]);
        const x2 = centerX + radius * Math.cos(angles[nextIndex - 1]);
        const y2 = centerY + radius * Math.sin(angles[nextIndex - 1]);

        const flowRate = parseFloat(document.getElementById(`correctedFlow1_${i}`).innerText);

        if (!isNaN(flowRate)) {
            const displayFlowRate = flowRate.toFixed(4);
            if (flowRate >= 0) {
                drawArrow(ctx, x1, y1, x2, y2, 'blue', displayFlowRate);
            } else {
                drawArrow(ctx, x2, y2, x1, y1, 'red', displayFlowRate);
            }
        }
    }
}

function drawArrow(ctx, x1, y1, x2, y2, color, flowRate) {
    const headlen = 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(x2, y2);
    ctx.fillStyle = color;
    ctx.fill();

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const offset = 15; // Offset distance from the line

    // Adjust the rotation angle for better readability
    let rotateAngle = angle;
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
        rotateAngle += Math.PI;
    }

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(rotateAngle);
    ctx.font = '14px Arial'; // Increase font size
    ctx.fillStyle = 'black';
    ctx.fillText(flowRate, 0, -offset);
    ctx.restore();
}

// Add event listeners to call generateTables on page load
document.addEventListener('DOMContentLoaded', generateTables);

function iterate(loop) {
    const loopPipes = [];
    for (let i = 1; i <= numPipes; i++) {
        const diameter = parseFloat(document.getElementById(`diameter${loop}_${i}`).value);
        const length = parseFloat(document.getElementById(`length${loop}_${i}`).value);
        let flow = parseFloat(document.getElementById(`flow${loop}_${i}`).value);
        loopPipes.push({ diameter, length, flow, index: i });
    }

    const convergenceThreshold = 0.01; // 1% change threshold
    let iterationCount = 0;
    let isConverged = false;

    while (!isConverged) {
        iterationCount++;
        let sumHf = 0;
        let sumHfQ = 0;

        // Calculate head loss and hf/Q for each pipe
        loopPipes.forEach(pipe => {
            const K = calculateK(pipe.diameter, pipe.length);
            const hf = calculateHeadLoss(K, pipe.flow);
            const hfQ = hf / pipe.flow;
            sumHf += hf;
            sumHfQ += hfQ;

            document.getElementById(`K${loop}_${pipe.index}`).innerText = K.toFixed(4);
            document.getElementById(`Q${loop}_${pipe.index}`).innerText = pipe.flow.toFixed(4);
            document.getElementById(`hf${loop}_${pipe.index}`).innerText = hf.toFixed(2);
            document.getElementById(`hfQ${loop}_${pipe.index}`).innerText = hfQ.toFixed(2);
        });

        // Calculate deltaQ
        const deltaQ = -sumHf / sumHfQ;

        // Update flows and check for convergence
        isConverged = true;
        loopPipes.forEach(pipe => {
            const previousFlow = pipe.flow;
            pipe.flow += deltaQ;
            const difference = Math.abs(pipe.flow - previousFlow);
            const threshold = convergenceThreshold * Math.abs(previousFlow);

            if (difference >= threshold) {
                isConverged = false; // Continue iterating if any pipe has not converged
            }

            // Special handling for checked pipes
            if (numLoops > 1) {
                const isChecked = document.getElementById(`sharedPipe${loop}_${pipe.index}`).checked;
                if (isChecked) {
                    // Calculate Q Correction based on the special rules
                    let correctionFactor = 0;

                    if (loop === 1) {
                        const otherLoop = 2;
                        correctionFactor = calculateCorrectionForCheckedPipe(loop, otherLoop);
                    } else if (loop === 2) {
                        const otherLoop = 1;
                        correctionFactor = calculateCorrectionForCheckedPipe(loop, otherLoop);
                    }

                    document.getElementById(`deltaQ${loop}_${pipe.index}`).innerText = correctionFactor.toFixed(4);
                    document.getElementById(`correctedFlow${loop}_${pipe.index}`).innerText = (pipe.flow + correctionFactor).toFixed(4);
                    document.getElementById(`flow${loop}_${pipe.index}`).value = (pipe.flow + correctionFactor).toFixed(4);
                } else {
                    document.getElementById(`deltaQ${loop}_${pipe.index}`).innerText = deltaQ.toFixed(4);
                    document.getElementById(`correctedFlow${loop}_${pipe.index}`).innerText = pipe.flow.toFixed(4);
                }
            } else {
                document.getElementById(`deltaQ${loop}_${pipe.index}`).innerText = deltaQ.toFixed(4);
                document.getElementById(`correctedFlow${loop}_${pipe.index}`).innerText = pipe.flow.toFixed(4);
            }
        });

        // Update sumHf and sumHfQ values dynamically
        document.getElementById(`sumHf${loop}`).innerText = `Σhf = ${sumHf.toFixed(2)}`;
        document.getElementById(`sumHfQ${loop}`).innerText = `Σhf/Q = ${sumHfQ.toFixed(2)}`;
    }

    // Update convergence message
    if (numLoops > 1) {
        document.getElementById('convergenceMessage').innerText = `Simulation completed.`;
    } else {
        document.getElementById('convergenceMessage').innerText = `Loop ${loop} converged in ${iterationCount} iterations.`;
    }
}


function calculateDeltaQForOtherLoop(loop) {
    let sumHf = 0;
    let sumHfQ = 0;

    for (let i = 1; i <= numPipes; i++) {
        const hf = parseFloat(document.getElementById(`hf${loop}_${i}`).innerText);
        const hfQ = parseFloat(document.getElementById(`hfQ${loop}_${i}`).innerText);

        if (!isNaN(hf)) {
            sumHf += hf;
        }

        if (!isNaN(hfQ)) {
            sumHfQ += hfQ;
        }
    }

    return -sumHf / sumHfQ;
}

function calculateK(diameter, length) {
    const C = 100;
    return 10.67 * length / (Math.pow(C, 1.85) * Math.pow(diameter, 4.87));
}

function calculateHeadLoss(K, flow) {
    const absFlow = Math.abs(flow);
    const absHeadLoss = K * Math.pow(absFlow, 1.85);
    return flow < 0 ? -absHeadLoss : absHeadLoss;
}

function resetLoop(loop) {
    for (let i = 1; i <= numPipes; i++) {
        document.getElementById(`diameter${loop}_${i}`).value = '';
        document.getElementById(`length${loop}_${i}`).value = '';
        document.getElementById(`flow${loop}_${i}`).value = '';
        document.getElementById(`K${loop}_${i}`).innerText = '';
        document.getElementById(`Q${loop}_${i}`).innerText = '';
        document.getElementById(`hf${loop}_${i}`).innerText = '';
        document.getElementById(`hfQ${loop}_${i}`).innerText = '';
        document.getElementById(`deltaQ${loop}_${i}`).innerText = '';
        document.getElementById(`correctedFlow${loop}_${i}`).innerText = '';
    }
    document.getElementById(`sumHf${loop}`).innerText = '';
    document.getElementById(`sumHfQ${loop}`).innerText = '';
}
