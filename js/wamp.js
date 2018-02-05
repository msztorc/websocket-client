(function() {
    'use strict';

    var url = null;
    var realm = null;
    var subscribed = [];
    var connection = null;
    var wsession = null;

    var logs = [];
    var ccount = 0;

    function console_log(topic, type, results) {

        var ltime = new Date().toLocaleString();
        var pprint = $('#pretty-print').is(':checked');

        logs.push({
            'topic': topic,
            'time': ltime,
            'type': type,
            'results': results
        });

        var ohtml = results;

        //json pretty print
        if (pprint)
            ohtml = syntaxHighlight(results);

        var htmlData = '<pre data-topic="' + topic + '">[' + (ltime) + '] <span class="badge badge-primary">' + topic + '</span> ' + ohtml + '</pre>';
        $('#wamp-console')
            .prepend(htmlData);
        ccount++;
        $('#console-count').text(ccount);
        $('#last-log').text(ltime);
    }

    function syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    function onConnectedUI() {
        $('input[name="url"]').prop("disabled", true);
        $('input[name="realm"]').prop("disabled", true);

        $('#wamp-status').removeClass('text-red').addClass('text-green');

        $('#connect-btn').css('display', 'none');
        $('#disconnect-btn').css('display', '');
    }

    function onDisconnectedUI() {
        $('input[name="url"]').prop("disabled", false);
        $('input[name="realm"]').prop("disabled", false);

        $('#wamp-status').removeClass('text-green').addClass('text-red');

        $('#disconnect-btn').css('display', 'none');
        $('#connect-btn').css('display', '');
    }

    function connect(url, realm) {
        connection = new autobahn.Connection({
            url: url,
            realm: realm
        });

        connection.onopen = function(session) {

            onConnectedUI();
            wsession = session;

        };


        connection.onclose = function(reason, details) {
            onDisconnectedUI();
        }

        // open connection to ws
        connection.open();
    }


    function subscribe(topic) {

        function onevent(args, obj, e) {

            if (typeof args[0] === 'object')
                console_log(e.topic, 'message', JSON.stringify(args[0], undefined, 4));
            else
                console_log(e.topic, 'message', args[0]);
        }

        wsession.subscribe(topic, onevent);
    }

    window.addEventListener('load', function() {

        $('#connect-btn').click(function() {
            url = $('input[name="url"]').val();
            realm = $('input[name="realm"]').val();

            connect(url, realm);

        });

        $('#disconnect-btn').click(function() {
            connection.close();
        });

        $('#send-btn').click(function() {
            var msg = $('#message').val();
            var show_in_console = $('#show-my-messages').is(':checked');
            var subscribe_topic = $('#subscribe-topic').is(':checked');

            if (subscribe_topic) {
                var mtopic = $('input[name="send-topic"]').val();
                if (mtopic != '' && subscribed.indexOf(mtopic) == -1) {
                    subscribed.push(mtopic);
                    subscribe(mtopic);
                }
            }

            wsession.publish(mtopic, [msg], {}, {
                exclude_me: !show_in_console
            });
        });

        $('#call-btn').click(function() {
            var rpc_name = $('input[name="rpc-name"]').val();
            var show_in_console = $('#rpc-console').is(':checked');

            //args
            var args = [];

            $('input[data-rel="rpc_arg"]').each(function() {
                var arg = $(this).val();

                if (arg != '')
                    args.push(arg);
            });

            //kwargs
            var kwargs = {};

            $('input[data-rel="rpc_key"]').each(function() {
                var key = $(this).val();
                var value = $('input[data-rel="' + $(this).attr('name') + '"]').val();

                if (key != '' && value != '')
                    kwargs[key] = value;
            });

            wsession.call(rpc_name, args, kwargs).then(
                function(res) {
                    if (show_in_console) {
                        if (typeof res === 'object')
                            console_log(rpc_name, 'procedure', JSON.stringify(res, undefined, 4));
                        else
                            console_log(rpc_name, 'procedure', res);
                    }
                },
                function(err) {
                    console_log(rpc_name, 'procedure', err.error);
                }
            );
        });

        $('#clear-console').click(function() {
            logs = [];
            $('#wamp-console').empty();
            ccount = 0;
            $('#console-count').text(0);
        });

        var isDragging = false;
        $("#console-resizer").mousedown(function() {
            isDragging = true;
        });

        $(document).mousemove(function(event) {
            if (isDragging) {
                var el = $("#console-body");
                if (event.clientY > 1 && event.clientY < (window.innerHeight - 70)) {
                    $(el).height($(window).height() - event.clientY);
                    $('#wamp-console').height($(el).height() - 110);
                }
            }
        }).mouseup(function() {
            isDragging = false;
        });

    }, false);
})();