console.log('Hello world');

const button = document.createElement('button');
button.textContent = 'Click me';
button.style.backgroundColor = '#007bff';
button.style.color = 'white';
button.style.padding = '10px 20px';
button.style.border = 'none';
button.style.borderRadius = '4px';
button.style.cursor = 'pointer';
button.style.margin = '10px';

button.addEventListener('click', () => {
  alert('hello world');
});

document.body.appendChild(button);
