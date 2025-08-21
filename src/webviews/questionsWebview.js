const questionNumberElement = document.getElementById('questionNumber');
const questionPropositionElement = document.getElementById('questionProposition');

window.addEventListener("message", (event) => {
    if (!event.data.payload.currentQuestion) {
        questionNumberElement.textContent = '?';
    } else {
        questionNumberElement.textContent = event.data.payload.currentQuestion;
        questionPropositionElement.textContent = '';
    }
});

