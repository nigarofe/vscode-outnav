const questionNumberElement = document.getElementById('questionNumber');
const questionPropositionElement = document.getElementById('questionProposition');

window.addEventListener("message", (event) => {
    console.log("Received message in questionsWebview:", event.data);
    if (event.data.type !== "onDidChangeTextEditorSelection") {
        return;
    }
    if (!event.data.payload.currentQuestionNumber) {
        questionNumberElement.textContent = '?';
        // console.log("No current question number available.");
        console.log(event.data.payload.currentQuestionNumber);
    } else {
        console.log("Current question number:", event.data.payload.currentQuestionNumber);
        questionNumberElement.textContent = event.data.payload.currentQuestionNumber;
        // Ensure questions is an array; if it's an object, convert to an array of values
        const questions = Object.values(event.data.payload.questions);
        const currentQuestion = questions.find((q) => q && q.number === event.data.payload.currentQuestionNumber);
        console.log("Current question:", currentQuestion);
        questionPropositionElement.textContent = currentQuestion ? (currentQuestion.proposition || '') : '';
    }
});

