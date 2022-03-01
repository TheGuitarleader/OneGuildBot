const fs = require('fs');
let logPath = null;
let messagePath = null;
let apiPath = null;

exports.loadLog = function (path) {
    logPath = path;

    if (!fs.existsSync(logPath)){
        fs.mkdirSync(logPath);
    }

    if(!fs.existsSync(logPath + "/latest.log")) {
        var create = fs.createWriteStream(logPath + "/latest.log");
        create.end();
    }
}

exports.loadMessage = function (path) {
    messagePath = path;

    if (!fs.existsSync(messagePath)){
        fs.mkdirSync(messagePath);
    }

    if(!fs.existsSync(messagePath + "/latest.log")) {
        var create = fs.createWriteStream(messagePath + "/latest.log");
        create.end();
    }
}

exports.loadAPI = function (path) {
    apiPath = path;

    if (!fs.existsSync(apiPath)){
        fs.mkdirSync(apiPath);
    }

    if(!fs.existsSync(apiPath + "/latest.log")) {
        var create = fs.createWriteStream(apiPath + "/latest.log");
        create.end();
    }
}

exports.debug = function (message, where) {
    if(message == null || message == undefined) {
        throw new Error("[NO_MESSAGE]: message cannot be null");
    }
    if(logPath == null || logPath == undefined) {
        throw new Error("[NO_ACTIVE_LOG]: log file not found")
    }
    if(where == undefined) {
        where = "main";
    }

    var logMessage = `[${GetTime()}] [${where}/DEBUG]: ${message}`;
    console.log(logMessage);

    fs.appendFile(logPath + "/latest.log", logMessage + "\n", function(err) {
        if(err) {
            throw new Error(err);
        }
    })
}

exports.error = function (message, where) {
    if(where == undefined) {
        where = "main";
    }

    var logMessage = `[${GetTime()}] [${where}/ERROR]: ${message}`;
    console.log(logMessage);

    fs.appendFile(logPath + "/latest.log", logMessage + "\n", function(err) {
        if(err) {
            throw new Error(err);
        }
    })
}

exports.log = function (message, where) {
    var logMessage = `[${GetTime()}] [${where}/INFO]: ${message}`;
    console.log(logMessage);

    fs.appendFile(logPath + "/latest.log", logMessage + "\n", function(err) {
        if(err) {
            throw new Error(err);
        }
    });
}

exports.logAPI = function (message, where) {
    var logMessage = `[${GetTime()}] [${where}/INFO]: ${message}`;
    console.log(logMessage);

    fs.appendFile(apiPath + "/latest.log", logMessage + "\n", function(err) {
        if(err) {
            throw new Error(err);
        }
    });
}

exports.message = function (channel, user, message) {
    var logMessage = `[${GetTime()}] [${channel.name}] (${user.username}#${user.discriminator}): ${message}`;
    console.log(logMessage);

    fs.appendFile(messagePath + "/latest.log", logMessage + "\n", function(err) {
        if(err) {
            throw new Error(err);
        }
    });
}

exports.warn = function (message, where) {
    if(where == undefined) {
        where = "main";
    }

    var logMessage = `[${GetTime()}] [${where}/WARN]: ${message}`;
    console.log(logMessage);

    fs.appendFile(logPath + "/latest.log", logMessage + "\n", function(err) {
        if(err) {
            throw new Error(err);
        }
    })
}

exports.warnAPI = function (message, where) {
    if(where == undefined) {
        where = "main";
    }

    var logMessage = `[${GetTime()}] [${where}/WARN]: ${message}`;
    console.log(logMessage);

    fs.appendFile(apiPath + "/latest.log", logMessage + "\n", function(err) {
        if(err) {
            throw new Error(err);
        }
    })
}

exports.overwrite = function() {
    fs.renameSync(logPath + "/latest.log", logPath + "/" + GetDate() + ".log");
}

exports.save = function (name) {
    if(fs.existsSync(logPath + "/latest.log"))
    {
        fs.renameSync(logPath + "/latest.log", logPath + "/" + GetDate() + ".log");
    }

    if(fs.existsSync(messagePath + "/latest.log"))
    {
        fs.renameSync(messagePath + "/latest.log", messagePath + "/" + GetDate() + ".log");
    }

    if(fs.existsSync(apiPath + "/latest.log"))
    {
        fs.renameSync(apiPath + "/latest.log", apiPath + "/" + GetDate() + ".log");
    }

    console.log(`[${GetTime()}] [KaiLogs/SAVE]: Saved the log as '${name}-${GetDate()}.log'`);
}

exports.save = function () {
    if (!fs.existsSync(`${logPath}/${GetMonth()}`)){
        fs.mkdirSync(`${logPath}/${GetMonth()}`);
    }

    if (!fs.existsSync(`${messagePath}/${GetMonth()}`)){
        fs.mkdirSync(`${messagePath}/${GetMonth()}`);
    }

    if (!fs.existsSync(`${apiPath}/${GetMonth()}`)){
        fs.mkdirSync(`${apiPath}/${GetMonth()}`);
    }

    if(fs.existsSync(`${logPath}/latest.log`)) {
        fs.renameSync(`${logPath}/latest.log`, `${logPath}/${GetMonth()}/${GetDate()}.log`);
        console.log(`[${GetTime()}] [KaiLogs/SAVE]: Saved the console log as '${GetDate()}.log'`);
    }

    if(fs.existsSync(`${messagePath}/latest.log`)) {
        fs.renameSync(`${messagePath}/latest.log`, `${messagePath}/${GetMonth()}/${GetDate()}.log`);
        console.log(`[${GetTime()}] [KaiLogs/SAVE]: Saved the message log as '${GetDate()}.log'`);
    }

    if(fs.existsSync(`${apiPath}/latest.log`)) {
        fs.renameSync(`${apiPath}/latest.log`, `${apiPath}/${GetMonth()}/${GetDate()}.log`);
        console.log(`[${GetTime()}] [KaiLogs/SAVE]: Saved the event log as '${GetDate()}.log'`);
    }
}

function GetDate()
{
    var today = new Date();
    var wrongMonth = ("0" + today.getMonth()).slice(-2);
    var month = parseInt(wrongMonth) + 1;
    var day = ("0" + today.getDate()).slice(-2);
    var year = today.getFullYear();
    return year + "-" + month + "-" + day;
}

function GetMonth()
{
    var today = new Date();
    var month = month = today.toLocaleString('default', { month: 'long' });
    return month;
}

function GetTime()
{
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    hours = hours < 10 ? '0'+hours : hours;
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var seconds = ("0" + date.getSeconds()).slice(-2);
    var strTime = hours + ':' + minutes + ':' + seconds + ampm;
    return strTime;
}