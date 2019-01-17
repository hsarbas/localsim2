$(document).ready(function() {
    $('#username').focus();

    $('#submit').click(function(event) {

        event.preventDefault(); // prevent PageReLoad

       var ValidEmail = $('#username').val() === 'admin'; // User validate
        var ValidPassword = $('#password').val() === 'password'; // Password validate

        if (ValidEmail === true && ValidPassword === true) { // if ValidEmail & ValidPassword
            $('#login-fail').hide();
            window.location = "main.html"; // go to home.html
        }
        else {
            $('#login-fail').show(); // show error msg
        }
    });
});