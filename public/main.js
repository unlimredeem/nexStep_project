const cookieParser = require("cookie-parser");

let logout = document.getElementById('Logout');

logout.addEventListener('click', function() {
    cookieParser.clearCookie('connect.sid');
    window.location.href = '/';
});