// EduAssist - Quiz Generator Functionality

// Authentication check
function checkAuthentication() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(user);
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    const user = checkAuthentication();
    if (!user) return;
});

(function() {
    const quizForm = document.getElementById('quiz-form');
    const contentSource = document.getElementById('content-source');
    const quizzesContainer = document.getElementById('quizzes-container');

    // Delete quiz
    async function deleteQuiz(quizId) {
        // Show immediate feedback
        showMessage('Deleting quiz...', 'info');
        
        try {
            const response = await fetch(`http://localhost:8000/api/quiz/${quizId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('Quiz deleted successfully', 'success');
                loadQuizzes();
            } else {
                const error = await response.json();
                showNotification(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting quiz:', error);
            showNotification('Error deleting quiz', 'error');
        }
    }

    // Make deleteQuiz globally available
    window.deleteQuiz = deleteQuiz;

    // Refresh button
    document.getElementById('refresh-quizzes')?.addEventListener('click', loadQuizzes);

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        loadContentSources();
        loadQuizzes();
    });

    // Load content sources
    async function loadContentSources() {
        try {
            const response = await fetch('http://localhost:8000/api/processed-content');
            const data = await response.json();
            const content = data.content || [];

            contentSource.innerHTML = '<option value="">Select processed content...</option>';
            content.forEach(item => {
                const option = document.createElement('option');
                option.value = item.path;
                option.textContent = `${item.name} (${(item.size / 1024).toFixed(1)} KB)`;
                contentSource.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading content sources:', error);
            contentSource.innerHTML = '<option value="">No content available</option>';
        }
    }

    // Load quizzes
    async function loadQuizzes() {
        try {
            const response = await fetch('http://localhost:8000/api/quizzes');
            const data = await response.json();
            const quizzes = data.quizzes || [];
            displayQuizzes(quizzes);
        } catch (error) {
            console.error('Error loading quizzes:', error);
            quizzesContainer.innerHTML = `
                <div class="error-message">
                    <p><i class="fas fa-exclamation-triangle"></i> Error loading quizzes. Please try again.</p>
                    <button onclick="loadQuizzes()" class="btn-secondary">Retry</button>
                </div>
            `;
        }
    }

    // Display quizzes
    function displayQuizzes(quizzes) {
        if (quizzes.length === 0) {
            quizzesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-brain"></i></div>
                    <p>No quizzes available</p>
                    <small>Create your first quiz to get started</small>
                </div>
            `;
            return;
        }

        quizzesContainer.innerHTML = quizzes.map(quiz => `
            <div class="quiz-card" style="border: 1px solid var(--neutral-200); border-radius: var(--radius-xl); padding: 1.5rem; margin-bottom: 1rem; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div class="quiz-content">
                    <h3 style="margin: 0 0 0.5rem 0; color: var(--neutral-800); font-size: 1.25rem;">${quiz.title || 'Quiz from Content'}</h3>
                    <p style="margin: 0 0 1rem 0; color: var(--neutral-600);">Generated quiz from educational content</p>
                    <div class="quiz-stats" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <span class="stat-badge">${quiz.totalQuestions} questions</span>
                        <span class="stat-badge">${quiz.timeLimit} min time limit</span>
                        <span class="quiz-status ${quiz.status}" style="background: var(--success-500); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem;">${quiz.status}</span>
                </div>
                <div class="quiz-meta">
                        <small style="color: var(--neutral-500);">Created: ${new Date(quiz.createdDate).toLocaleDateString()}</small>
                    </div>
                </div>
                <div class="quiz-actions" style="display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="startQuiz('${quiz.id}')" title="Start taking this quiz" style="flex: 1; min-width: 120px;">
                        <i class="fas fa-file-alt"></i> Take Test
                    </button>
                    <button class="btn btn-secondary" onclick="downloadQuizFromList('${quiz.id}')" title="Download quiz as PDF" style="flex: 1; min-width: 120px;">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn" onclick="deleteQuiz('${quiz.id}')" title="Delete this quiz" style="flex: 1; min-width: 120px; background: var(--error-500); color: white;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Form submission
    quizForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(quizForm);
        const data = {
            title: document.getElementById('quiz-title').value,
            description: document.getElementById('quiz-description').value,
            contentPath: document.getElementById('content-source').value,
            questionCount: parseInt(document.getElementById('question-count').value),
            difficulty: document.getElementById('difficulty-level').value,
            questionTypes: Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value)
        };

        if (!data.contentPath) {
            showMessage('Please select a content source', 'error');
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/api/quiz/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
            const result = await response.json();
                showMessage('Quiz generated successfully!', 'success');
                quizForm.reset();
                loadQuizzes();
            } else {
                const error = await response.json();
                showMessage(`Error: ${error.error || 'Failed to generate quiz'}`, 'error');
            }
        } catch (error) {
            console.error('Error generating quiz:', error);
            showMessage('Error generating quiz. Please try again.', 'error');
        }
    });

    // Start quiz
    window.startQuiz = function(quizId) {
        console.log('Starting quiz:', quizId);
        
        // Fetch quiz data
        fetch(`http://localhost:8000/api/quiz/${quizId}`)
            .then(response => response.json())
            .then(quiz => {
                if (quiz.error) {
                    showMessage('Quiz not found!', 'error');
                    return;
                }
                
                // Start the quiz
                startQuizSession(quiz);
            })
            .catch(error => {
                console.error('Error loading quiz:', error);
                showMessage('Error loading quiz!', 'error');
            });
    };

    function startQuizSession(quiz) {
        // Initialize quiz answers tracking
        window.quizAnswers = {};
        window.currentQuiz = quiz;
        
        // Create quiz modal
        const modal = document.createElement('div');
        modal.className = 'quiz-modal';
        modal.innerHTML = `
            <div class="quiz-modal-content">
                <div class="quiz-header">
                    <h2>${quiz.title}</h2>
                    <button class="close-quiz" onclick="closeQuiz()">&times;</button>
                </div>
                <div class="quiz-body">
                    <div class="quiz-info">
                        <p>Generated quiz from educational content</p>
                        <div class="quiz-stats">
                            <span>${quiz.questions.length} questions</span>
                            <span>70% to pass</span>
                        </div>
                    </div>
                    <div class="quiz-questions" id="quiz-questions">
                        <!-- Questions will be loaded here -->
                    </div>
                    <div class="quiz-actions">
                        <button id="submit-quiz" class="btn-primary" onclick="submitQuiz()">Submit Quiz</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load questions
        loadQuizQuestions(quiz);
    }

    function loadQuizQuestions(quiz) {
        const questionsContainer = document.getElementById('quiz-questions');
        let currentQuestion = 0;
        
        function showQuestion(index) {
            if (index >= quiz.questions.length) {
                showQuizResults();
                return;
            }
            
            const question = quiz.questions[index];
            questionsContainer.innerHTML = `
                <div class="question-card">
                    <div class="question-header">
                        <h3>Question ${index + 1} of ${quiz.questions.length}</h3>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${((index + 1) / quiz.questions.length) * 100}%"></div>
                        </div>
                    </div>
                    <div class="question-content">
                        <h4>${question.question}</h4>
                        <div class="question-options">
                            ${question.options.map((option, optionIndex) => `
                                <label class="option-item">
                                    <input type="radio" name="question-${index}" value="${optionIndex}">
                                    <span class="option-text">${option}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="question-actions">
                        <button class="btn-secondary" onclick="previousQuestion()" ${index === 0 ? 'disabled' : ''}>Previous</button>
                        <button class="btn-primary" onclick="nextQuestion()">${index === quiz.questions.length - 1 ? 'Finish' : 'Next'}</button>
                    </div>
                </div>
            `;
        }
        
        window.nextQuestion = function() {
            // Save current answer
            const selectedAnswer = document.querySelector(`input[name="question-${currentQuestion}"]:checked`);
            if (selectedAnswer) {
                const question = quiz.questions[currentQuestion];
                const userAnswerIndex = parseInt(selectedAnswer.value);
                const isCorrect = userAnswerIndex === question.correctAnswer;
                window.quizAnswers[currentQuestion] = isCorrect;
                window.userAnswers = window.userAnswers || {};
                window.userAnswers[currentQuestion] = userAnswerIndex;
            }
            
            currentQuestion++;
            
            // If this was the last question, show submit option
            if (currentQuestion >= quiz.questions.length) {
                showSubmitOption();
            } else {
                showQuestion(currentQuestion);
            }
        };
        
        window.previousQuestion = function() {
            currentQuestion--;
            showQuestion(currentQuestion);
        };
        
        function showSubmitOption() {
            const questionsContainer = document.getElementById('quiz-questions');
            const answeredQuestions = Object.keys(window.quizAnswers).length;
            const totalQuestions = quiz.questions.length;
            
            questionsContainer.innerHTML = `
                <div class="submit-card">
                    <div class="submit-header">
                        <h3><i class="fas fa-file-alt"></i> Quiz Complete!</h3>
                        <p>You have answered ${answeredQuestions} out of ${totalQuestions} questions.</p>
                    </div>
                    <div class="submit-content">
                        <p>Review your answers and submit when ready.</p>
                        <div class="submit-actions">
                            <button class="btn-secondary" onclick="goBackToQuestions()">← Review Answers</button>
                            <button class="btn-primary" onclick="confirmSubmit()">Submit Quiz</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        window.goBackToQuestions = function() {
            currentQuestion = quiz.questions.length - 1;
            showQuestion(currentQuestion);
        };
        
        window.confirmSubmit = function() {
            const answeredQuestions = Object.keys(window.quizAnswers).length;
            const totalQuestions = quiz.questions.length;
            
            if (confirm(`You have attempted ${answeredQuestions} out of ${totalQuestions} questions. Do you want to proceed with submission?`)) {
                submitQuiz();
            }
        };
        
        showQuestion(0);
    }

    function showQuizResults() {
        // Calculate results
        const answers = [];
        const questionElements = document.querySelectorAll('[name^="question-"]');
        questionElements.forEach(element => {
            if (element.checked) {
                const questionIndex = parseInt(element.name.split('-')[1]);
                answers[questionIndex] = parseInt(element.value);
            }
        });
        
        // Show results
        document.getElementById('quiz-questions').innerHTML = `
            <div class="quiz-results">
                <h3>Quiz Complete!</h3>
                <p>Thank you for taking the quiz. Results will be calculated soon.</p>
                <button class="btn-primary" onclick="closeQuiz()">Close</button>
            </div>
        `;
    }

    window.submitQuiz = function() {
        // Calculate results
        const quizData = window.currentQuiz;
        if (!quizData) return;
        
        // Count attempted questions
        const attemptedQuestions = window.quizAnswers ? Object.keys(window.quizAnswers).length : 0;
        const totalQuestions = quizData.questions.length;
        
        // Dynamic confirmation dialog
        let confirmMessage;
        if (attemptedQuestions < totalQuestions) {
            confirmMessage = `You attempted ${attemptedQuestions} out of ${totalQuestions} questions. Are you sure you want to submit?`;
        } else {
            confirmMessage = 'Are you sure you want to submit your quiz?';
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const correctAnswers = window.quizAnswers ? Object.values(window.quizAnswers).filter(answer => answer === true).length : 0;
        // Calculate score based on total questions, not attempted questions
        const score = Math.round((correctAnswers / totalQuestions) * 100);
        const passed = score >= 70;
        
        // Generate detailed question analysis - show all questions
        const questionAnalysis = [];
        quizData.questions.forEach((question, index) => {
            const wasAttempted = window.quizAnswers && window.quizAnswers.hasOwnProperty(index);
            const userAnswer = wasAttempted ? window.quizAnswers[index] : null;
            const isCorrect = wasAttempted ? userAnswer === true : false;
            const userAnswerIndex = wasAttempted && window.userAnswers ? window.userAnswers[index] : null;
            const userAnswerText = wasAttempted && userAnswerIndex !== null && question.options[userAnswerIndex] 
                ? question.options[userAnswerIndex] 
                : (wasAttempted ? 'Not answered' : 'Unattempted');
            const correctAnswerText = question.options && question.options[question.correctAnswer] 
                ? question.options[question.correctAnswer] 
                : question.correctAnswer;
            
            questionAnalysis.push({
                question: question.question,
                userAnswer: userAnswerText,
                correctAnswer: correctAnswerText,
                isCorrect: isCorrect,
                wasAttempted: wasAttempted,
                explanation: question.explanation || 'This is the correct answer based on the content analysis.'
            });
        });
        
        // Show assessment results
        const modal = document.querySelector('.quiz-modal');
        if (modal) {
            modal.innerHTML = `
                <div class="quiz-results">
                    <div class="results-header">
                        <h2>📊 Quiz Assessment Results</h2>
                        <button class="close-btn" onclick="closeQuiz()">&times;</button>
                    </div>
                    <div class="results-content">
                        <div class="score-display ${passed ? 'passed' : 'failed'}">
                            <div class="score-circle">
                                <span class="score-number">${score}%</span>
                                <span class="score-label">${passed ? 'PASSED' : 'NEED IMPROVEMENT'}</span>
                            </div>
                        </div>
                        <div class="results-stats">
                            <div class="stat-item">
                                <span class="stat-label">Questions Attempted:</span>
                                <span class="stat-value">${attemptedQuestions} / ${totalQuestions}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Correct Answers:</span>
                                <span class="stat-value">${correctAnswers}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Incorrect Answers:</span>
                                <span class="stat-value">${attemptedQuestions - correctAnswers}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Passing Score:</span>
                                <span class="stat-value">70%</span>
                            </div>
                        </div>
                        <div class="performance-analysis">
                            <h3>📈 Performance Analysis</h3>
                            <p>${score >= 90 ? 'Excellent work! You have a strong understanding of the material.' : 
                              score >= 70 ? 'Good job! You understand the main concepts well.' : 
                              'Keep studying! Review the material and try again to improve your understanding.'}</p>
                        </div>
                        <div class="detailed-analysis">
                            <h3>📋 Detailed Question Analysis</h3>
                            <div class="questions-review">
                                ${questionAnalysis.map((q, index) => `
                                    <div class="question-review ${q.wasAttempted ? (q.isCorrect ? 'correct' : 'incorrect') : 'unattempted'}">
                                        <div class="question-header">
                                            <h4>Question ${index + 1}</h4>
                                            <span class="status-badge ${q.wasAttempted ? (q.isCorrect ? 'correct' : 'incorrect') : 'unattempted'}">
                                                ${q.wasAttempted ? (q.isCorrect ? '✓ Correct' : '✗ Incorrect') : '⏸ Unattempted'}
                                            </span>
                                        </div>
                                        <p class="question-text">${q.question}</p>
                                        <div class="answer-comparison">
                                            <div class="answer-item">
                                                <strong>Your Answer:</strong> ${q.userAnswer}
                                            </div>
                                            <div class="answer-item">
                                                <strong>Correct Answer:</strong> ${q.correctAnswer}
                                            </div>
                                        </div>
                                        <div class="explanation">
                                            <strong>Explanation:</strong> ${q.explanation}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="results-actions">
                            <button class="btn-primary" onclick="downloadQuiz()">📥 Download Quiz</button>
                            <button class="btn-secondary" onclick="closeQuiz()">Close</button>
                        </div>
                    </div>
                </div>
            `;
        }
    };

    window.downloadQuizFromList = function(quizId) {
        console.log('Downloading quiz:', quizId);
        // Fetch quiz data and download
        fetch(`http://localhost:8000/api/quiz/${quizId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(quiz => {
                console.log('Quiz data received:', quiz);
                if (quiz.error) {
                    showMessage('Quiz not found!', 'error');
                    return;
                }
                downloadQuizContent(quiz);
                showMessage('Quiz downloaded successfully!', 'success');
            })
            .catch(error => {
                console.error('Error loading quiz:', error);
                showMessage('Error loading quiz: ' + error.message, 'error');
            });
    };

    window.downloadQuiz = function() {
        const quizData = window.currentQuiz;
        if (!quizData) return;
        downloadQuizContent(quizData);
    };

    function downloadQuizContent(quizData) {
        if (!quizData) return;
        
        // Create downloadable content
        let content = `QUIZ: ${quizData.title || 'Generated Quiz'}\n`;
        content += `Description: Generated quiz from educational content\n`;
        content += `Created: ${new Date(quizData.createdDate).toLocaleDateString()}\n`;
        content += `Questions: ${quizData.questions.length}\n`;
        content += `Passing Score: 70%\n\n`;
        content += `========================================\n\n`;
        
        quizData.questions.forEach((question, index) => {
            content += `Question ${index + 1}: ${question.question}\n`;
            question.options.forEach((option, optIndex) => {
                const letter = String.fromCharCode(65 + optIndex); // A, B, C, D
                content += `${letter}) ${option}\n`;
            });
            content += `\n`;
        });
        
        // Create and download file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quizData.title.replace(/[^a-zA-Z0-9]/g, '_')}_quiz.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showMessage('Quiz downloaded successfully!', 'success');
    };

    window.closeQuiz = function() {
        const modal = document.querySelector('.quiz-modal');
        if (modal) {
            modal.remove();
        }
    };

    // Show notification
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            notification.style.backgroundColor = '#10b981';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#ef4444';
        } else if (type === 'info') {
            notification.style.backgroundColor = '#3b82f6';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Show message (legacy function)
    function showMessage(message, type) {
        showNotification(message, type);
    }
})();
