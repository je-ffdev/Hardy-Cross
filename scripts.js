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
        loopTable.innerHTML = `
            <h2>Loop ${loop}</h2>
            <table id="loop${loop}Table">
                <thead>
                    <tr>
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
                        <td colspan="6" class="sum-row"></td>
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
}

function generateTableRows(numPipes, loop) {
    let rows = '';
    for (let i = 1; i <= numPipes; i++) {
        rows += `
            <tr>
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
}

function calculateCorrections(loop) {
    let sumHf = 0;
    let sumHfQ = 0;
    let allHfFilled = true;
    let allHfQFilled = true;

    for (let i = 1; i <= numPipes; i++) {
        const hf = parseFloat(document.getElementById(`hf${loop}_${i}`).innerText);
        const hfQ = parseFloat(document.getElementById(`hfQ${loop}_${i}`).innerText);

        if (!isNaN(hf)) {
            sumHf += hf;
        } else {
            allHfFilled = false;
        }

        if (!isNaN(hfQ)) {
            sumHfQ += hfQ;
        } else {
            allHfQFilled = false;
        }
    }

    if (allHfFilled) {
        document.getElementById(`sumHf${loop}`).innerText = `Σhf = ${sumHf.toFixed(2)}`;
    }

    if (allHfQFilled) {
        document.getElementById(`sumHfQ${loop}`).innerText = `Σhf/Q = ${sumHfQ.toFixed(2)}`;
    }

    if (allHfFilled && allHfQFilled) {
        iterate(loop);
    }
}

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

            document.getElementById(`deltaQ${loop}_${pipe.index}`).innerText = deltaQ.toFixed(4);
            document.getElementById(`correctedFlow${loop}_${pipe.index}`).innerText = pipe.flow.toFixed(4);
            document.getElementById(`flow${loop}_${pipe.index}`).value = pipe.flow.toFixed(4);
        });

        // Update sumHf and sumHfQ values dynamically
        document.getElementById(`sumHf${loop}`).innerText = `Σhf = ${sumHf.toFixed(2)}`;
        document.getElementById(`sumHfQ${loop}`).innerText = `Σhf/Q = ${sumHfQ.toFixed(2)}`;
    }

    document.getElementById('convergenceMessage').innerText = `Loop ${loop} converged in ${iterationCount} iterations.`;
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
