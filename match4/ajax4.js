window.url = '/api/match/4';
request = function() {
    var list = { "page": window.page, };
    $.ajax({
        url: window.url,
        dataType: "json",
        async: false,
        data: list,
        type: "GET",
        beforeSend: function(request) {},
        success: function(data) {
            datas = data.info;
            $('.number').text('').append(datas);
            var j_key = '.' + hex_md5(btoa(data.key + data.value).replace(/=/g, ''));
            $(j_key).css('display', 'none');
            $('.img_number').removeClass().addClass('img_number')
        },
        complete: function() {},
        error: function() {
            alert('因未知原因，数据拉取失败。可能是触发了风控系统');
            alert('生而为虫，我很抱歉');
            $('.page-message').eq(0).addClass('active');
            $('.page-message').removeClass('active')
        }
    })
};
request()