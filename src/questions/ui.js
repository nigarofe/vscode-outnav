const questionNumberEl = document.getElementById('questionNumber');
const questionPropositionEl = document.getElementById('questionProposition');
const questionStepByStepEl = document.getElementById('questionStepByStep');
const questionAnswerEl = document.getElementById('questionAnswer');

const recommendationSelectDisciplinesEl = document.getElementById('recommendationSelectDisciplines');
const recommendationTableBodyEl = document.getElementById('recommendationsTableBody');

let questionsJson = [];

recommendationSelectDisciplinesEl.addEventListener("change", () => {
    updateRecommendedTable();
});


window.addEventListener("message", (event) => {
    const currentQuestionNumber = event.data.payload.currentQuestionNumber;
    if (!currentQuestionNumber) {
        questionNumberEl.textContent = '?';
        questionPropositionEl.textContent = 'No question loaded.';
        questionStepByStepEl.textContent = 'No question loaded.';
        questionAnswerEl.textContent = 'No question loaded.';
        console.log("No current question number available. Returned: " + currentQuestionNumber);
        return;
    }
    questionsJson = Object.values(event.data.payload.questionsJson);

    // Populate first tab
    const currentQuestion = questionsJson.find((q) => q && q.number === currentQuestionNumber);
    questionPropositionEl.innerHTML = markdownToHtml(currentQuestion.proposition);
    questionStepByStepEl.innerHTML = markdownToHtml(currentQuestion.step_by_step);
    questionAnswerEl.innerHTML = markdownToHtml(currentQuestion.answer);
    questionNumberEl.innerHTML = currentQuestionNumber;

    // Populate second tab
    updateRecommendedTable(questionsJson);

    // Render Katex
    renderKatex();
});




function filterQuestionsByDisciplines(questions, selectedDisciplines) {
    return questions.filter(q => {
        const questionDiscipline = q.discipline || [];
        return selectedDisciplines.some(d => questionDiscipline.includes(d));
    });
}

function updateRecommendedTable() {
    let selectedDisciplines = recommendationSelectDisciplinesEl.value;
    let filteredQuestions = filterQuestionsByDisciplines(questionsJson, selectedDisciplines);
    console.log("selectedDisciplines", selectedDisciplines);
    console.log("filteredQuestions", filteredQuestions);

    recommendationTableBodyEl.innerHTML = '';
    filteredQuestions.forEach((q) => {
        const cells = [];

        const qNumberCell = document.createElement('vscode-table-cell');
        const qSourceCell = document.createElement('vscode-table-cell');
        const qDescriptionCell = document.createElement('vscode-table-cell');
        const qAttemptsSummaryCell = document.createElement('vscode-table-cell');
        const qDSLA = document.createElement('vscode-table-cell');
        const qLaMI = document.createElement('vscode-table-cell');
        const qPMG_D = document.createElement('vscode-table-cell');
        const qPMG_X = document.createElement('vscode-table-cell');

        qNumberCell.textContent = q.number;
        qSourceCell.innerHTML = markdownToHtml(q.source || '');
        qDescriptionCell.innerHTML = markdownToHtml(q.description || '');
        qAttemptsSummaryCell.innerHTML = markdownToHtml(q.calculated_metrics.attempts_summary || '');
        qDSLA.innerHTML = markdownToHtml(q.calculated_metrics.DSLA || '');
        qLaMI.innerHTML = markdownToHtml(q.calculated_metrics.LaMI || '');
        qPMG_D.innerHTML = markdownToHtml(q.calculated_metrics.PMG_D || '');
        qPMG_X.innerHTML = markdownToHtml(q.calculated_metrics.PMG_X || '');

        cells.push(qNumberCell);
        cells.push(qSourceCell);
        cells.push(qDescriptionCell);
        cells.push(qAttemptsSummaryCell);
        cells.push(qDSLA);
        cells.push(qLaMI);
        cells.push(qPMG_D);
        cells.push(qPMG_X);

        const row = document.createElement('vscode-table-row');
        cells.forEach(c => row.appendChild(c));
        recommendationTableBodyEl.appendChild(row);
    });
}