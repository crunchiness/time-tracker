const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Soup = imports.gi.Soup;
const St = imports.gi.St;

const workingIcon = Gio.icon_new_for_string(`${Me.path}/icons/working-icon.png`);
const restingIcon = Gio.icon_new_for_string(`${Me.path}/icons/resting-icon.png`);
// const _somethingIsWrong = Gio.icon_new_for_string(`${Me.path}/icons/`);

const statusIcon = new St.Icon({gicon: restingIcon, style_class: 'my-icon'});
const statusLabel = new St.Label({y_align: Clutter.ActorAlign.CENTER, text: '...'});

let button, httpSession, startTime, topBox;
let isWorking = true;
let totalTime = 0;


/**
 * For sending a toggle message
 *
 * @param timestamp - unix timestamp in milliseconds
 * @private
 */
function _sendMessage(timestamp) {
    const request = Soup.Message.new('POST', 'http://localhost:8080');
    const payload = {
        toggleOn: isWorking,
        timestamp: timestamp
    };
    const payloadStr = JSON.stringify(payload);
    request.set_request ('application/json', Soup.MemoryUse.COPY, payloadStr, payloadStr.length);
    httpSession.queue_message(request, (httpSession, message) => {
        if (message.status_code !== 200) {
            // TODO
        }
    });
}

function _toggle() {
    isWorking = !isWorking;
    const now = Date.now();
    if (isWorking) {
        startTime = now;
        statusIcon.gicon = workingIcon;
    } else {
        totalTime += (now - startTime) || 0;
        statusIcon.gicon = restingIcon;
    }
    _sendMessage(now);
}


function zPad(n, width) {
    const z = '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

/**
 * Responsible for displaying status label (time)
 *
 * @private
 */
function _refresh() {
    let seconds;
    if (isWorking) {
        seconds = ((totalTime + (Date.now() - startTime)) / 1000).toFixed(0);
    } else {
        seconds = (totalTime / 1000).toFixed(0);
    }
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    hours = zPad(hours, 2);
    minutes = zPad(minutes % 60, 2);
    seconds = zPad(seconds % 60, 2);

    statusLabel.text = `${hours}:${minutes}:${seconds}`;
    Mainloop.timeout_add(1000, _refresh);
}

function init() {
    button = new St.Bin({ style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });
    topBox = new St.BoxLayout();
    topBox.add_actor(statusLabel);
    topBox.add_actor(statusIcon);
    button.set_child(topBox);
    button.connect('button-press-event', _toggle);

    // Initialize HTTP session
    httpSession = new Soup.SessionAsync();
    Soup.Session.prototype.add_feature.call(httpSession, new Soup.ProxyResolverDefault());
}

function enable() {
    _toggle();
    Mainloop.timeout_add(1000, _refresh);
    Main.panel._rightBox.insert_child_at_index(button, 0);
}

function disable() {
    // TODO: close HTTP session
    Main.panel._rightBox.remove_child(button);
}
