const questionNumberElement = document.getElementById('questionNumber');
const questionPropositionElement = document.getElementById('questionProposition');
const questionStepByStepElement = document.getElementById('questionStepByStep');
const questionAnswerElement = document.getElementById('questionAnswer');

window.addEventListener("message", (event) => {
    // console.log("Received message in questionsWebview:", event.data);

    if (!event.data.payload.currentQuestionNumber) {
        questionNumberElement.textContent = '?';
        console.log("No current question number available. Returned: " + event.data.payload.currentQuestionNumber);
        return;
    }

    const currentQuestionNumber = event.data.payload.currentQuestionNumber;
    const questions = Object.values(event.data.payload.questions);
    // console.log("Current question number:", currentQuestionNumber);

    const currentQuestion = questions.find((q) => q && q.number === currentQuestionNumber);
    // markdownToHtml returns HTML (e.g. <vscode-divider>), insert as HTML so elements render
    questionPropositionElement.innerHTML = markdownToHtml(currentQuestion.proposition);
    questionStepByStepElement.innerHTML = markdownToHtml(currentQuestion.step_by_step);
    questionAnswerElement.innerHTML = markdownToHtml(currentQuestion.answer);
    questionNumberElement.innerHTML = markdownToHtml(currentQuestionNumber);

    renderKatex();
});

