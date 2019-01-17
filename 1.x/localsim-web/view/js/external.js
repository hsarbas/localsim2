$(function(){
    let includes = $('[data-include]');
    jQuery.each(includes, function(){
        let file = $(this).data('include') + '.html';
        $(this).load(file);
    });
});