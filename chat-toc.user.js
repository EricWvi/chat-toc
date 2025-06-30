// ==UserScript==
// @name            Chat TOC
// @description     Add a draggable Table of Contents for common AI websites.
// @updateURL       https://raw.githubusercontent.com/EricWvi/chat-toc/main/chat-toc.user.js
// @downloadURL     https://raw.githubusercontent.com/EricWvi/chat-toc/main/chat-toc.user.js
// @version         1.4.2
// @author          Eric Wang
// @namespace       ChatTOC
// @copyright       2025, Eric Wang (https://github.com/EricWvi)
// @license         MIT
// @match           https://github.com/copilot
// @match           https://github.com/copilot/*
// @match           https://chatgpt.com
// @match           https://chatgpt.com/*
// @match           https://claude.ai/chat
// @match           https://claude.ai/chat/*
// @match           https://chat.deepseek.com
// @match           https://chat.deepseek.com/*
// @match           https://chat.qwen.ai
// @match           https://chat.qwen.ai/*
// @match           https://yuanbao.tencent.com/chat
// @match           https://yuanbao.tencent.com/chat/*
// @match           https://chat.minimaxi.com
// @match           https://chat.minimaxi.com/*
// @match           https://www.doubao.com/chat
// @match           https://www.doubao.com/chat/*
// @match           https://chatglm.cn
// @match           https://chatglm.cn/*
// @match           https://www.tongyi.com/qianwen
// @match           https://www.tongyi.com/qianwen/*
// ==/UserScript==

(function () {
    'use strict';

    let tocContainer = null;
    let isVisible = true;
    let lastMessageCount = 0;
    let lastMessageTexts = [];
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    function getElementsByXPath(xpath) {
        const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        const elements = [];
        for (let i = 0; i < result.snapshotLength; i++) {
            elements.push(result.snapshotItem(i));
        }
        return elements;
    }

    // Define strategies for different hosts
    const strategies = {
        'chatgpt.com': function () {
            return [...document.querySelectorAll('article')]
                .filter(article => article.firstElementChild.innerText.includes('You said:'))
                .map(article => article.querySelector('div'));
        },
        'chat.qwen.ai': function () {
            return [...document.querySelectorAll('[class*="user-message-text-content"]')];
        },
        'chatglm.cn': function () {
            return [...document.querySelectorAll('[class*="conversation"][class*="question"] .question-text-style')];
        },
        'doubao.com': function () {
            return [...document.querySelectorAll('[class*="user-message-text-content"]')];
        },
        'tongyi.com': function () {
            return [...document.querySelectorAll('[class*="questionItem"]')];
        },
        'yuanbao.tencent.com': function () {
            return [...document.querySelectorAll('[class*="agent-chat__bubble--human"] .agent-chat__bubble__content')];
        },
        'chat.minimaxi.com': function () {
            return [...document.querySelectorAll("#chat-card-list > div")].filter((_, idx) => idx % 2 == 0);
        },
        'claude.ai': function () {
            return [...document.querySelectorAll('[data-testid="user-message"]')];
        },
        'github.com': function () {
            return [...document.querySelectorAll('[class*="UserMessage"][class*="ChatMessage"]')];
        },
        'chat.deepseek.com': function () {
            return [...getElementsByXPath(`//*[@id="root"]/div/div/div[2]/div[3]/div/div[2]/div/div/div[1]/div`)]
                .filter((_, idx) => idx % 2 == 0);
        },
        'doubao.com': function () {
            return [...getElementsByXPath(`//*[@id="root"]/div[1]/div/div[3]/div[1]/div[1]/div/div/div[2]/div/div[1]/div/div/div[2]/div`)]
                .filter((_, idx) => idx % 2 == 0);
        },
        'default': function () {
            return [];
        }
    };

    // Detect system theme
    function getSystemTheme() {
        // Check GitHub's theme first
        const htmlElement = document.documentElement;
        const bodyElement = document.body;

        // GitHub sets data-color-mode attribute
        const colorMode = htmlElement.getAttribute('data-color-mode');
        const colorTheme = htmlElement.getAttribute('data-color-theme') ||
            htmlElement.getAttribute('data-theme');

        // Check various theme indicators
        if (colorMode === 'dark' || colorTheme === 'dark' ||
            bodyElement.classList.contains('dark') ||
            bodyElement.classList.contains('dark-theme')) {
            return 'dark';
        }

        if (colorMode === 'light' || colorTheme === 'light' ||
            bodyElement.classList.contains('light') ||
            bodyElement.classList.contains('light-theme')) {
            return 'light';
        }

        // Fallback to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    // Get theme-specific colors
    function getThemeColors(theme) {
        if (theme === 'dark') {
            return {
                background: '#0d1117',
                headerBackground: '#161b22',
                border: '#30363d',
                text: '#f0f6fc',
                secondaryText: '#e6edf3',
                mutedText: '#7d8590',
                hoverBackground: '#21262d',
                highlightBackground: '#1f6feb20',
                scrollbarTrack: '#161b22',
                scrollbarThumb: '#30363d',
                scrollbarThumbHover: '#484f58'
            };
        } else {
            return {
                background: '#ffffff',
                headerBackground: '#f6f8fa',
                border: '#d0d7de',
                text: '#24292f',
                secondaryText: '#24292f',
                mutedText: '#656d76',
                hoverBackground: '#f6f8fa',
                highlightBackground: '#0969da20',
                scrollbarTrack: '#f6f8fa',
                scrollbarThumb: '#d0d7de',
                scrollbarThumbHover: '#afb8c1'
            };
        }
    }

    // Save position to localStorage
    function savePosition(x, y) {
        localStorage.setItem('copilot-toc-position', JSON.stringify({ x, y }));
    }

    // Load position from localStorage
    function loadPosition() {
        const saved = localStorage.getItem('copilot-toc-position');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return { x: window.innerWidth - 320, y: 80 };
            }
        }
        return { x: window.innerWidth - 320, y: 80 };
    }

    // Set up drag functionality
    function setupDragFunctionality() {
        const header = document.getElementById('toc-header');
        if (!header || !tocContainer) return;

        header.style.cursor = 'move';
        header.style.userSelect = 'none';

        function startDrag(e) {
            // Don't start drag if clicking on the toggle button
            if (e.target.id === 'toc-toggle') return;

            isDragging = true;
            const rect = tocContainer.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;

            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging) return;

            let newX = e.clientX - dragOffset.x;
            let newY = e.clientY - dragOffset.y;

            // Keep within viewport bounds
            const containerRect = tocContainer.getBoundingClientRect();
            const maxX = window.innerWidth - containerRect.width;
            const maxY = window.innerHeight - containerRect.height;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            tocContainer.style.left = newX + 'px';
            tocContainer.style.top = newY + 'px';
            tocContainer.style.right = 'auto'; // Remove right positioning
        }

        function stopDrag() {
            if (isDragging) {
                isDragging = false;
                const rect = tocContainer.getBoundingClientRect();
                savePosition(rect.left, rect.top);
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', stopDrag);
            }
        }

        header.addEventListener('mousedown', startDrag);
    }

    // Create the TOC container
    function createTOC() {
        if (tocContainer) {
            tocContainer.remove();
        }

        const theme = getSystemTheme();
        const colors = getThemeColors(theme);
        const position = loadPosition();

        tocContainer = document.createElement('div');
        tocContainer.id = 'copilot-chat-toc';
        tocContainer.innerHTML = `
            <div id="toc-header">
                <h3>Chat TOC</h3>
                <button id="toc-toggle">−</button>
            </div>
            <div id="toc-content">
                <ul id="toc-list"></ul>
            </div>
        `;

        // Add styles with theme colors
        const styles = `
            #copilot-chat-toc {
                position: fixed;
                left: ${position.x}px;
                top: ${position.y}px;
                width: 300px;
                max-height: 60vh;
                background: ${colors.background};
                border: 1px solid ${colors.border};
                border-radius: 8px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            }

            #copilot-chat-toc.collapse {
                width: 120px;
            }

            #toc-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background: ${colors.headerBackground};
                border-bottom: 1px solid ${colors.border};
                border-radius: 8px 8px 0 0;
                cursor: move;
                user-select: none;
            }

            #toc-header:active {
                cursor: grabbing;
            }

            #toc-header h3 {
                margin: 0;
                color: ${colors.text};
                font-size: 14px;
                font-weight: 600;
                pointer-events: none;
            }

            #toc-toggle {
                background: none;
                border: none;
                color: ${colors.mutedText};
                cursor: pointer;
                font-size: 16px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.15s ease;
                pointer-events: auto;
            }

            #toc-toggle:hover {
                color: ${colors.text};
            }

            #toc-content {
                max-height: calc(60vh - 50px);
                overflow-y: auto;
                padding: 10px 0;
            }

            #toc-content.hidden {
                display: none;
            }

            #toc-list {
                list-style: none;
                margin: 0;
                padding: 0;
            }

            .toc-item {
                display: flex;
                text-align: left;
                padding: 8px 15px;
                cursor: pointer;
                border-bottom: 1px solid ${colors.border};
                color: ${colors.secondaryText};
                font-size: 12px;
                line-height: 1.4;
                transition: background-color 0.15s ease;
            }

            .toc-item:hover {
                background: ${colors.hoverBackground};
            }

            .toc-item:last-child {
                border-bottom: none;
            }

            .toc-item-number {
                color: ${colors.mutedText};
                font-weight: 600;
                margin-right: 8px;
            }

            .toc-item-text {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* Scrollbar styling */
            #toc-content::-webkit-scrollbar {
                width: 6px;
            }

            #toc-content::-webkit-scrollbar-track {
                background: ${colors.scrollbarTrack};
            }

            #toc-content::-webkit-scrollbar-thumb {
                background: ${colors.scrollbarThumb};
                border-radius: 3px;
            }

            #toc-content::-webkit-scrollbar-thumb:hover {
                background: ${colors.scrollbarThumbHover};
            }

            /* Drag indicator */
            #toc-header::before {
                content: "⋮⋮";
                position: absolute;
                left: 6px;
                top: 50%;
                transform: translateY(-50%);
                color: ${colors.mutedText};
                font-size: 10px;
                line-height: 1;
                letter-spacing: -1px;
                opacity: 0.5;
            }
        `;

        // Remove existing styles and add new ones
        const existingStyles = document.getElementById('copilot-toc-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        const styleElement = document.createElement('style');
        styleElement.id = 'copilot-toc-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);

        document.body.appendChild(tocContainer);

        // Set up drag functionality
        setupDragFunctionality();

        // Add toggle functionality
        const toggleButton = document.getElementById('toc-toggle');
        const tocContent = document.getElementById('toc-content');

        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering drag
            isVisible = !isVisible;
            if (isVisible) {
                tocContent.classList.remove('hidden');
                toggleButton.textContent = '−';
            } else {
                tocContent.classList.add('hidden');
                toggleButton.textContent = '+';
            }
            const toc = document.getElementById('copilot-chat-toc');
            if (!toc || !tocContainer) return;
            // Convert to a number (removing "px")
            let leftStr = window.getComputedStyle(toc).left;
            let leftValue = parseInt(leftStr, 10);
            if (isVisible) {
                leftValue -= 180;
                toc.style.left = leftValue + "px";
                toc.classList.remove('collapse');
            } else {
                leftValue += 180;
                toc.style.left = leftValue + "px";
                toc.classList.add('collapse');
            }
        });

        // Handle window resize to keep TOC in bounds
        window.addEventListener('resize', () => {
            const rect = tocContainer.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;

            let newX = Math.max(0, Math.min(rect.left, maxX));
            let newY = Math.max(0, Math.min(rect.top, maxY));

            tocContainer.style.left = newX + 'px';
            tocContainer.style.top = newY + 'px';

            savePosition(newX, newY);
        });
    }

    // Extract text from a message element
    function extractMessageText(messageElement) {
        // Try to find the text content, avoiding code blocks and other elements
        const textElements = messageElement.querySelectorAll('p, div:not([class*="code"]):not([class*="Code"])');
        let text = '';

        for (const element of textElements) {
            const elementText = element.textContent.trim();
            if (elementText && !element.closest('[class*="code"], [class*="Code"], pre')) {
                text += elementText + ' ';
            }
        }

        // Fallback to full text content if no specific elements found
        if (!text.trim()) {
            text = messageElement.textContent.trim();
        }

        return text.trim();
    }

    // Check if TOC needs to be updated
    function needsUpdate(userMessages) {
        if (userMessages.length !== lastMessageCount) {
            return true;
        }

        // Check if any message text has changed
        for (let i = 0; i < userMessages.length; i++) {
            const currentText = userMessages[i].innerText.trim();
            if (currentText !== lastMessageTexts[i]) {
                return true;
            }
        }

        return false;
    }

    // Update the TOC with current messages
    function updateTOC() {
        // Determine which strategy to use
        const host = window.location.hostname.replace(/^www\./, '');
        const extractor = strategies[host] || strategies['default'];
        const userMessages = extractor();
        const tocList = document.getElementById('toc-list');

        if (!tocList) return;

        // Check if update is actually needed
        if (!needsUpdate(userMessages)) {
            return;
        }

        console.log('Updating TOC - message count changed from', lastMessageCount, 'to', userMessages.length);

        // Update tracking variables
        lastMessageCount = userMessages.length;
        lastMessageTexts = [];

        tocList.innerHTML = '';

        userMessages.forEach((message, index) => {
            // Add an ID to the message for jumping
            const messageId = `user-message-${index}`;
            message.id = messageId;

            // Extract message text
            const messageText = message.innerText.trim();
            lastMessageTexts.push(messageText);

            if (!messageText) return;

            // Create TOC item
            const listItem = document.createElement('li');
            listItem.className = 'toc-item';
            listItem.innerHTML = `<span class="toc-item-number">${index + 1}.</span>`;
            const textSpan = document.createElement('span');
            textSpan.className = 'toc-item-text';
            textSpan.title = messageText;
            textSpan.textContent = messageText;  // This treats HTML as literal text
            listItem.appendChild(textSpan);

            // Add click handler to jump to message
            listItem.addEventListener('click', () => {
                const targetMessage = document.getElementById(messageId);
                if (targetMessage) {
                    targetMessage.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });

                    // Highlight the message briefly
                    const theme = getSystemTheme();
                    const colors = getThemeColors(theme);

                    targetMessage.style.backgroundColor = colors.highlightBackground;
                    setTimeout(() => {
                        targetMessage.style.backgroundColor = '';
                    }, 2000);
                }
            });

            tocList.appendChild(listItem);
        });
    }

    // Initialize the TOC
    function initTOC() {
        createTOC();
        updateTOC();
    }

    // Watch for theme changes
    function setupThemeWatcher() {
        // Watch for changes to theme attributes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'data-color-mode' ||
                        mutation.attributeName === 'data-color-theme' ||
                        mutation.attributeName === 'data-theme' ||
                        mutation.attributeName === 'class')) {
                    // Recreate TOC with new theme
                    setTimeout(() => {
                        if (tocContainer) {
                            initTOC();
                        }
                    }, 100);
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-color-mode', 'data-color-theme', 'data-theme', 'class']
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Also listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', () => {
                setTimeout(() => {
                    if (tocContainer) {
                        initTOC();
                    }
                }, 100);
            });
        }
    }

    // Wait for the page to load and then initialize
    function waitForMessages() {
        const checkForMessages = () => {
            // Determine which strategy to use
            const host = window.location.hostname.replace(/^www\./, '');
            const extractor = strategies[host] || strategies['default'];
            const userMessages = extractor();
            if (userMessages.length > 0) {
                initTOC();
                setupThemeWatcher();

                // Set up a mutation observer to update TOC when new messages are added
                const observer = new MutationObserver(() => {
                    // Debounce the update to avoid excessive calls
                    clearTimeout(observer.timeout);
                    observer.timeout = setTimeout(() => {
                        updateTOC();
                    }, 1000); // Increased debounce time
                });

                // Observe the chat container for changes
                const chatContainer = document.body;
                if (chatContainer) {
                    observer.observe(chatContainer, {
                        childList: true,
                        subtree: true
                    });
                }
            } else {
                // Keep checking every 2 seconds if no messages found yet
                setTimeout(checkForMessages, 2000);
            }
        };

        checkForMessages();
    }
    console.log("Chat TOC script")

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForMessages);
    } else {
        waitForMessages();
    }
})();
