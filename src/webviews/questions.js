window.addEventListener('DOMContentLoaded', () => {
    const questionNumberElement = document.getElementById('questionNumber');
    const questionPropositionElement = document.getElementById('questionProposition');
    const questionStepByStepElement = document.getElementById('questionStepByStep');
    const questionAnswerElement = document.getElementById('questionAnswer');

    if (!window.__outnav_message_handler_installed) {
        const __outnav_message_handler = (event) => {
            // console.log("Received message in questionsWebview:", event.data);

            if (!event.data.payload.currentQuestionNumber) {
                if (questionNumberElement) { questionNumberElement.textContent = '?'; }
                console.log("No current question number available. Returned: " + event.data.payload.currentQuestionNumber);
                return;
            }

            if (!questionNumberElement || !questionPropositionElement || !questionStepByStepElement || !questionAnswerElement) { return; }

            const currentQuestionNumber = event.data.payload.currentQuestionNumber;
            const questionsJson = Object.values(event.data.payload.questionsJson);

            const currentQuestion = questionsJson.find((q) => q && q.number === currentQuestionNumber);
            // markdownToHtml returns HTML (e.g. <vscode-divider>), insert as HTML so elements render
            // console.log(currentQuestion.proposition)
            // console.log(typeof currentQuestion.proposition)
            questionPropositionElement.innerHTML = markdownToHtml(currentQuestion.proposition);
            questionStepByStepElement.innerHTML = markdownToHtml(currentQuestion.step_by_step);
            questionAnswerElement.innerHTML = markdownToHtml(currentQuestion.answer);
            questionNumberElement.innerHTML = currentQuestionNumber;

            renderKatex();
        };
        window.addEventListener("message", __outnav_message_handler);
        window.__outnav_message_handler_installed = true;
    }
});

