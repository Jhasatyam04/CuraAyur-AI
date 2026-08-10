// theme.js
// Handles light/dark mode toggling and persistence

const initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
};

initTheme();

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
    
    const updateIcons = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        themeToggleBtns.forEach(btn => {
            const moon = btn.querySelector('.moon-icon');
            const sun = btn.querySelector('.sun-icon');
            if (moon && sun) {
                if (isDark) {
                    moon.style.display = 'none';
                    sun.style.display = 'block';
                } else {
                    moon.style.display = 'block';
                    sun.style.display = 'none';
                }
            }
        });
    };
    
    updateIcons();

    themeToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateIcons();
        });
    });
});
