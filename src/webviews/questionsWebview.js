const questionNumberElement = document.getElementById('questionNumber');

window.addEventListener("message", (event) => {
    if (!event.data.payload.currentQuestion) {
        questionNumberElement.textContent = '?';
    } else {
        questionNumberElement.textContent = event.data.payload.currentQuestion;
    }
});