chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: functionToInject
    });
});

function functionToInject() {

    /****************** AGREGAR BOTONES ******************/
    function crearBoton(text, id) {

        const button = document.createElement('button');
        button.textContent = text;
        button.id = id;
        return button;
    }

    function agregarBotones() {

        const navElement = document.querySelector('nav[aria-label="Principal"]');
        if (navElement) {
            const buttonRealizarScroll = crearBoton('Realizar scroll', 'realizar-scroll');
            const buttonDescargarImagenes = crearBoton('Descargar imagenes', 'descargar-imagenes');
            navElement.append(buttonRealizarScroll, buttonDescargarImagenes);

        } else {
            console.error('No se encontró la etiqueta nav con aria-label="Principal".');
        }
    }

    // Validar que los botones ya fueron creados
    const buttonRealizarScroll = document.getElementById('realizar-scroll');
    const buttonDescargarImagenes = document.getElementById('descargar-imagenes');

    if (!buttonRealizarScroll && !buttonDescargarImagenes) {
        agregarBotones();
    }

    /****************** REALIZAR SCROLL AUTOMATICO ******************/
    let postsUnicos = new Set(); // Utilizar un Set para evitar posts repetidos
    let isTabActive = true;
    let shouldContinueScroll = true;

    function obtenerPosts() {

        // Obtener imagenes
        const imagenes = document.querySelectorAll('img');

        // Convertir NodeList en Array, para recorrerlo con map. Mencionar que forEach si puede recorrer un NodeList.
        const imgs = [...imagenes].map((img) => {
            return {
                img: img,
                src: img.src
            };
        });

        // Obtener imagenes con url que comiencen con lo indicado
        // Las imagenes, comienzan con "https://pbs.twimg.com/media"
        // Los videos o gif, comienzan con "https://pbs.twimg.com/tweet_video_thumb"
        const imgsFiltradas = imgs.filter(img => {
            return img['src'].startsWith('https://pbs.twimg.com/media') || img['src'].startsWith('https://pbs.twimg.com/tweet_video_thumb') || img['src'].startsWith('https://pbs.twimg.com/ext_tw_video_thumb');
        });

        // Obtener posts de imagenes
        const posts = imgsFiltradas.map(img => {
            const parentLink = img['img'].closest('a'); // Obtener el primer elemento padre "a" de las imagenes
            if (parentLink) {
                return JSON.stringify({ // Convertir JSON a cadena de texto antes de agregarlo al Set. Los objetos Set solo pueden almacenar valores únicos de tipos primitivos (como números, cadenas de texto, etc.), no pueden comparar igualdad de objetos complejos (como los objetos JSON).
                    post: parentLink.href,
                    img: img['src']
                });
            }
            return null;
        });

        // Obtener posts unicos (sin repetir)
        posts.forEach(post => postsUnicos.add(post)); // Agregar los posts al Set

        // Debug
        // console.log([...postsUnicos]); // Convertir Set en Array
        console.log([...postsUnicos].map(JSON.parse)); // Convertir Set en Array, recorrer cada elemento del array y convertirlo en JSON

        // Mostrar cantidad de posts obtenidos
        const buttonDescargarImagenes = document.getElementById('descargar-imagenes');
        buttonDescargarImagenes.textContent = 'Descargar imagenes: ' + postsUnicos.size
    }

    function realizarScrollAutomatico() {

        let lastScrollHeight = 0;
        let currentScrollHeight = -1;

        const scrollInterval = setInterval(() => { // Se ejecuta cada 1 seg
            obtenerPosts();

            if (isTabActive == false) {
                shouldContinueScroll = true;
                clearInterval(scrollInterval);
                return;
            }

            currentScrollHeight = document.documentElement.scrollHeight;
            if (currentScrollHeight === lastScrollHeight) {
                shouldContinueScroll = false;
                clearInterval(scrollInterval);
                console.log('Fin de scroll en página');
            } else {
                lastScrollHeight = currentScrollHeight;
                window.scrollBy(0, window.innerHeight);
            }
        }, 1000);
    }

    document.getElementById('realizar-scroll').addEventListener('click', () => {
        obtenerPosts();
        realizarScrollAutomatico();

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') {
                isTabActive = false;
            } else {
                isTabActive = true;
                if (shouldContinueScroll) {
                    obtenerPosts();
                    realizarScrollAutomatico();
                }
            }
        });
    });

    /****************** DESCARGAR ARCHIVO ******************/
    function descargarArchivo() {

        // Data de prueba para enviar al API
        // const posts = [
        //     {
        //         img: 'https://pbs.twimg.com/media/GCKNZf8WwAA3z9T?format=png&name=360x360',
        //         post: 'https://twitter.com/yinxelh/status/1739108046217826709/photo/1'
        //     },
        //     {
        //         img: 'https://pbs.twimg.com/media/FE0fGZdXsAMsanM?format=jpg&name=360x360',
        //         post: 'https://twitter.com/ilonqueen/status/1462859657408487425/photo/1'
        //     },
        //     {
        //         img: 'https://pbs.twimg.com/tweet_video_thumb/FkRyZVVXEAAkRje?format=jpg&name=360x360',
        //         post: 'https://twitter.com/ilonqueen/status/1604533156102930433/photo/1'
        //     },
        // ];

        // Convertir Set en Array, recorrer cada elemento del array y convertirlo en JSON
        let posts = [...postsUnicos].map(JSON.parse);

        // Obtener username
        let username = window.location.pathname.split('/')[1];

        // Obtener auth_token almacenado en localStorage
        let authToken = localStorage.getItem('auth_token');

        // Solicitar auth_token al usuario
        if (!authToken || authToken == 'null') {
            authToken = prompt('Por favor ingresa tu auth_token:');
            localStorage.setItem('auth_token', authToken);
        }

        // Verificar auth_token ingresado
        if (authToken && authToken != 'null') {
            // Confirmar peticion HTTP
            if (confirm('¿Está seguro?')) {
                // Peticion HTTP
                fetch('http://localhost:3000/posts', { // http://localhost:3000/test
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        authToken: authToken,
                        posts: posts
                    }),
                })
                    .then(response => response.json())
                    .then(data => console.log(data))
                    .catch((error) => {
                        console.error('Error:', error);
                    });
            }
        }
    }

    document.getElementById('descargar-imagenes').addEventListener('click', () => {
        descargarArchivo();
    });
}
