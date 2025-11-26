$(document).ready(function () {


    // toggle the menu
    $('#navbarBtn').click(function () {
        $('#navbar').slideToggle(500);
    });
    // toggle the menu ends



    // responsive search bar in header
    function moveSearchForm() {
        if ($(window).width() <= 1024) {  // Checking if screen is lg or larger
            // Move the #searchForm div into #smallSreenBox
            if ($('#searchForm').parent().attr('id') !== 'smallSreenBox') {
                $('#searchForm').detach().appendTo('#smallSreenBox');
            }
        } else {
            // If screen is smaller than lg, make sure the div is back in its original place (optional)
            if ($('#searchForm').parent().attr('id') === 'smallSreenBox') {
                $('#searchForm').detach().appendTo('#lgScreenBox');
            }
        }
    }
    // Run on document load
    moveSearchForm();

    // Run whenever window is resized
    $(window).resize(function () {
        moveSearchForm();
    });

});