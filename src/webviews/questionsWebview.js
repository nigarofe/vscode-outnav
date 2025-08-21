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
    questionPropositionElement.textContent = currentQuestion.proposition;
    questionStepByStepElement.textContent = currentQuestion.stepByStep;
    questionAnswerElement.textContent = currentQuestion.answer;
    questionNumberElement.textContent = currentQuestionNumber;
});

