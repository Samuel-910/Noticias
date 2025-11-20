// tailwind.config.js
module.exports = {
    content: [
        './src/**/*.{html,ts}',
        './node_modules/flowbite/**/*.js' // ESTA LÍNEA ES CLAVE
    ],
    // ...
    plugins: [
        require('flowbite/plugin') // ESTA LÍNEA ES CLAVE
    ],
}