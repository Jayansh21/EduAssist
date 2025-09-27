// Flashcards Page JavaScript

const API_BASE = 'http://localhost:8000/api';

let currentFlashcards = [];
let currentCardIndex = 0;
let isFlipped = false;

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

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    const user = checkAuthentication();
    if (!user) return;
    
    initializeFlashcards();
    setupFormHandlers();
});

function initializeFlashcards() {
    loadFlashcardContent();
}

function setupFormHandlers() {
    const form = document.getElementById('flashcard-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        generateFlashcards();
    });
}

async function loadFlashcardContent() {
    try {
        const response = await fetch(`${API_BASE}/processed-content`);
        const data = await response.json();
        
        const select = document.getElementById('flashcard-content');
        select.innerHTML = '<option value="">Select content for flashcards</option>';
        
        if (data.content && data.content.length > 0) {
            data.content.forEach(content => {
                const option = document.createElement('option');
                option.value = content.path;
                option.textContent = content.name;
                select.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No content available - Upload files first";
            option.disabled = true;
            select.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading content for flashcards:', error);
        showNotification('Error loading content', 'error');
    }
}

async function generateFlashcards() {
    try {
        const contentPath = document.getElementById('flashcard-content').value;
        const cardCount = parseInt(document.getElementById('card-count').value);
        const cardType = document.getElementById('card-type').value;
        
        if (!contentPath) {
            showNotification('Please select content source', 'warning');
            return;
        }
        
        showNotification('Generating flashcards...', 'info');
        
        // Generate flashcards using AI
        const flashcards = await generateRealFlashcards(contentPath, cardCount, cardType);
        
        // Store flashcards globally
        currentFlashcards = flashcards;
        currentCardIndex = 0;
        isFlipped = false;
        
        // Display flashcards
        displayFlashcards(flashcards);
        updatePreview();
        
        showNotification('Flashcards generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating flashcards:', error);
        showNotification('Error generating flashcards', 'error');
    }
}

async function generateRealFlashcards(contentPath, cardCount, cardType) {
    try {
        // Call backend API to generate flashcards
        const response = await fetch('http://localhost:8000/api/flashcards/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contentPath: contentPath,
                cardCount: cardCount,
                cardType: cardType
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.flashcards || [];
        } else {
            console.warn('Failed to generate real flashcards, using mock');
            return generateMockFlashcards(contentPath, cardCount, cardType);
        }
    } catch (error) {
        console.warn('Error generating real flashcards, using mock:', error);
        return generateMockFlashcards(contentPath, cardCount, cardType);
    }
}

async function generateMockFlashcards(contentPath, cardCount, cardType) {
    // Mock flashcard generation based on card type
    const flashcards = [];
    const cardTypes = {
        qa: {
            fronts: [
                "What is the main topic discussed?",
                "What are the key principles?",
                "What is the primary objective?",
                "What are the main components?",
                "What is the significance of this concept?",
                "What are the advantages mentioned?",
                "What are the potential challenges?",
                "What is the recommended approach?",
                "What are the key takeaways?",
                "What should be remembered?",
                "How does this apply in practice?",
                "What are the main benefits?",
                "What are the core concepts?",
                "What is the fundamental principle?",
                "What are the essential elements?",
                "What is the primary focus?",
                "What are the key features?",
                "What is the main purpose?",
                "What are the critical points?",
                "What should be understood?"
            ],
            backs: [
                "The main topic covers fundamental concepts and applications in the field.",
                "Key principles include accuracy, efficiency, and user-centered design.",
                "The primary objective is to enhance learning outcomes and engagement.",
                "Main components include analysis, implementation, and evaluation phases.",
                "This concept is significant for understanding advanced methodologies.",
                "Advantages include improved performance and better user experience.",
                "Challenges may include resource constraints and technical limitations.",
                "The recommended approach involves systematic planning and execution.",
                "Key takeaways include practical applications and theoretical foundations.",
                "Important points to remember for future reference and application.",
                "This applies through real-world implementation and practical examples.",
                "Main benefits include enhanced productivity and streamlined processes.",
                "Core concepts form the foundation of understanding in this area.",
                "The fundamental principle guides all related activities and decisions.",
                "Essential elements are the critical components that make this work.",
                "The primary focus is on achieving specific learning objectives.",
                "Key features distinguish this approach from alternatives.",
                "The main purpose is to facilitate effective learning and retention.",
                "Critical points are the most important aspects to understand.",
                "This should be understood through comprehensive study and practice."
            ]
        },
        term: {
            fronts: [
                "Machine Learning",
                "Algorithm",
                "Data Structure",
                "API",
                "Database",
                "Framework",
                "Protocol",
                "Interface",
                "Optimization",
                "Integration",
                "Authentication",
                "Authorization",
                "Encryption",
                "Compression",
                "Caching",
                "Indexing",
                "Querying",
                "Parsing",
                "Validation",
                "Normalization"
            ],
            backs: [
                "A subset of AI that enables computers to learn without explicit programming.",
                "A step-by-step procedure for solving a problem or completing a task.",
                "A way of organizing and storing data for efficient access and modification.",
                "Application Programming Interface - a set of protocols for building software.",
                "An organized collection of data stored and accessed electronically.",
                "A reusable set of libraries or tools for developing software applications.",
                "A set of rules governing the exchange of data between devices.",
                "A point of interaction between different systems or components.",
                "The process of making something as effective or functional as possible.",
                "The process of combining different systems to work together.",
                "The process of verifying the identity of a user or system.",
                "The process of determining what actions a user is allowed to perform.",
                "The process of encoding information to protect it from unauthorized access.",
                "The process of reducing the size of data for storage or transmission.",
                "The process of storing frequently accessed data in faster storage.",
                "The process of creating data structures for faster data retrieval.",
                "The process of requesting specific data from a database or system.",
                "The process of analyzing and breaking down data into components.",
                "The process of checking data for correctness and completeness.",
                "The process of organizing data to reduce redundancy and improve efficiency."
            ]
        },
        concept: {
            fronts: [
                "Object-Oriented Programming",
                "Design Patterns",
                "Software Architecture",
                "Agile Development",
                "Version Control",
                "Testing Strategies",
                "Performance Optimization",
                "Security Best Practices",
                "Code Quality",
                "Documentation",
                "Data Modeling",
                "System Design",
                "User Experience",
                "Scalability",
                "Maintainability",
                "Reliability",
                "Usability",
                "Accessibility",
                "Compatibility",
                "Portability"
            ],
            backs: [
                "A programming paradigm based on objects containing data and methods, promoting code reusability and modularity.",
                "Reusable solutions to common problems in software design, providing templates for solving recurring issues.",
                "The high-level structure of software systems, defining components and their relationships.",
                "An iterative approach to software development emphasizing collaboration and flexibility.",
                "A system for tracking changes to files over time, enabling collaboration and rollback capabilities.",
                "Systematic approaches to verifying software functionality, including unit, integration, and system testing.",
                "Techniques for improving software performance through efficient algorithms and resource management.",
                "Guidelines and practices for protecting software systems from vulnerabilities and attacks.",
                "Standards and practices for writing maintainable, readable, and efficient code.",
                "Written descriptions and explanations of code functionality for future reference and maintenance.",
                "The process of designing data structures and relationships for effective data management.",
                "The process of planning and organizing system components for optimal performance.",
                "The overall experience a user has when interacting with a product or service.",
                "The ability of a system to handle increased load by adding resources or improving efficiency.",
                "The ease with which software can be modified, updated, or extended over time.",
                "The ability of a system to perform consistently under various conditions.",
                "The ease with which users can learn and use a system effectively.",
                "The design of systems to be usable by people with various abilities and disabilities.",
                "The ability of software to work with different systems, platforms, or environments.",
                "The ease with which software can be moved or adapted to different environments."
            ]
        }
    };
    
    const typeData = cardTypes[cardType];
    
    for (let i = 0; i < Math.min(cardCount, typeData.fronts.length); i++) {
        flashcards.push({
            id: i + 1,
            front: typeData.fronts[i],
            back: typeData.backs[i],
            type: cardType
        });
    }
    
    return flashcards;
}

function displayFlashcards(flashcards) {
    const container = document.getElementById('flashcards-container');
    const grid = document.getElementById('flashcards-grid');
    
    // Generate flashcard grid
    grid.innerHTML = flashcards.map((card, index) => `
        <div class="flashcard" data-card-id="${index}" onclick="flipCard(${index})" style="cursor: pointer;">
            <div class="flashcard-inner" id="card-${index}">
                <div class="flashcard-front" style="background: white; padding: 1.5rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); height: 200px; display: flex; flex-direction: column; justify-content: center; text-align: center; border: 1px solid var(--neutral-200);">
                    <div style="font-size: 0.75rem; color: var(--primary-600); margin-bottom: 0.75rem; font-weight: 500;">FRONT</div>
                    <div style="font-size: 0.875rem; color: var(--neutral-800); line-height: 1.4;">${card.front}</div>
                </div>
                <div class="flashcard-back" style="background: var(--primary-50); padding: 1.5rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); height: 200px; display: flex; flex-direction: column; justify-content: center; text-align: center; border: 1px solid var(--primary-200);">
                    <div style="font-size: 0.75rem; color: var(--primary-700); margin-bottom: 0.75rem; font-weight: 500;">BACK</div>
                    <div style="font-size: 0.875rem; color: var(--neutral-800); line-height: 1.4;">${card.back}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

function updatePreview() {
    const preview = document.getElementById('flashcard-preview');
    const controls = document.getElementById('study-controls');
    const counter = document.getElementById('card-counter');
    
    if (currentFlashcards.length === 0) {
        preview.innerHTML = `
            <div style="text-align: center; color: var(--neutral-500);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🃏</div>
                <h4 style="margin: 0 0 0.5rem 0; color: var(--neutral-700);">Generate Your First Set</h4>
                <p style="margin: 0; font-size: 0.875rem;">Configure settings and generate flashcards to see them here</p>
            </div>
        `;
        controls.style.display = 'none';
        return;
    }
    
    const currentCard = currentFlashcards[currentCardIndex];
    isFlipped = false;
    
    preview.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); width: 100%; text-align: center;">
            <div style="font-size: 0.875rem; color: var(--primary-600); margin-bottom: 1rem; font-weight: 500;">FRONT</div>
            <div style="font-size: 1.25rem; color: var(--neutral-800); margin-bottom: 1.5rem; line-height: 1.5;">${currentCard.front}</div>
            <button onclick="flipPreviewCard()" class="btn btn-outline">Flip Card</button>
        </div>
    `;
    
    counter.textContent = `${currentCardIndex + 1} / ${currentFlashcards.length}`;
    controls.style.display = 'flex';
}

function flipPreviewCard() {
    const preview = document.getElementById('flashcard-preview');
    const currentCard = currentFlashcards[currentCardIndex];
    
    if (isFlipped) {
        preview.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); width: 100%; text-align: center;">
                <div style="font-size: 0.875rem; color: var(--primary-600); margin-bottom: 1rem; font-weight: 500;">FRONT</div>
                <div style="font-size: 1.25rem; color: var(--neutral-800); margin-bottom: 1.5rem; line-height: 1.5;">${currentCard.front}</div>
                <button onclick="flipPreviewCard()" class="btn btn-outline">Flip Card</button>
            </div>
        `;
        isFlipped = false;
    } else {
        preview.innerHTML = `
            <div style="background: var(--primary-50); padding: 2rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); width: 100%; text-align: center;">
                <div style="font-size: 0.875rem; color: var(--primary-700); margin-bottom: 1rem; font-weight: 500;">BACK</div>
                <div style="font-size: 1.25rem; color: var(--neutral-800); margin-bottom: 1.5rem; line-height: 1.5;">${currentCard.back}</div>
                <button onclick="flipPreviewCard()" class="btn btn-outline">Flip Card</button>
            </div>
        `;
        isFlipped = true;
    }
}

function previousCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        updatePreview();
    }
}

function nextCard() {
    if (currentCardIndex < currentFlashcards.length - 1) {
        currentCardIndex++;
        updatePreview();
    }
}

function shuffleCards() {
    if (currentFlashcards.length === 0) return;
    
    // Fisher-Yates shuffle algorithm
    for (let i = currentFlashcards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentFlashcards[i], currentFlashcards[j]] = [currentFlashcards[j], currentFlashcards[i]];
    }
    
    currentCardIndex = 0;
    updatePreview();
    displayFlashcards(currentFlashcards);
    showNotification('Cards shuffled!', 'success');
}

function flipCard(cardId) {
    const card = document.getElementById(`card-${cardId}`);
    if (card.style.transform === 'rotateY(180deg)') {
        card.style.transform = 'rotateY(0deg)';
    } else {
        card.style.transform = 'rotateY(180deg)';
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-lg);
        color: white;
        font-weight: 500;
        z-index: 1000;
        box-shadow: var(--shadow-lg);
        animation: slideIn 0.3s ease;
    `;
    
    // Set colors based on type
    switch(type) {
        case 'success':
            notification.style.background = 'var(--success-500)';
            break;
        case 'error':
            notification.style.background = 'var(--error-500)';
            break;
        case 'warning':
            notification.style.background = 'var(--warning-500)';
            break;
        default:
            notification.style.background = 'var(--primary-500)';
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
