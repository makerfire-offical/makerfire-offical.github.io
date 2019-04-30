'use strict';

var dataPackage;
const { ipcRenderer } = require('electron');
ipcRenderer.on('dataPackage', (e, data) => { //接收响应
	if(isNaN(data.pitch)){//发送数据的时候，接收到的是NaN
		return;
	}
	else
	{
		dataPackage = data;
	}
})
ipcRenderer.sendToHost("begin");//向webview所在页面发送消息,代表scratch启动完成

var protocol = {
	//arm:0,
	motor_1: 1,
	motor_2: 2,
	motor_3: 3,
	motor_4: 4,
	motor_5: 5,
	motor_6: 6,
	motor_7: 7,
	motor_8: 8,
	axis: 9,
	calibrate: 10,
	arduino: 11,
	beep: 12,
	version: 13,
	get_dataPackage: 14,
	set_pos: 15,
	takeOff: 16,
	autoLand: 17,
	set_rotate: 18,
	dir: 19,

	video_begin: 21,
	video_stop: 22,
	photo: 23,
};

var COLOR_LED = 1;
var SERVO = 2;


function scratchBlock(ext) {
	var connected = false;
	var notifyConnection = false;
	var trimPitch = 0;
	var trimRoll = 0;
	var userKey = 0;
	var timerId = -1;
	var lang = "test";
	var pos = {
		xl: 0,
		xh: 0,
		yl: 0,
		yh: 0,
		zl: 0,
		zh: 0
	};

	var blocks = {
		en: [
			[' ', 'Calibrate', 'calibrate'],
			[' ', 'LED %d.led %d.onoff', 'runLed', 'ALL', 'ON'],
			[' ', 'colorLight %d.color', 'colorLed', 'BLACK'],
			[' ', 'buzzer buzz %d.beep', 'beeper', "OFF"],
			[' ', 'Arm Flight', 'armFlight'],
			[' ', 'Disarm Flight', 'disarmFlight'],
			[' ', 'Set %d.motor speed %d.motorPWM', 'runMotor', "M1", '0'],
			//[' ', 'Set go %d.flightDir at speed %d.speed','runDirection', "Forward", '100'],
			[' ', 'Set rotate %d.flightRotate at speed %d.speed', 'runRotate', "CR", '100'],
			[' ', 'Set altitude at speed %d up', 'runAltitude', '100'],
			['h', "when pressed the remote keys %d.key", 'when_key', 'U1'],
			['r', 'YawAngle', 'yAngle'],
			['r', 'RollAngle', 'rAngle'],
			['r', 'PitchAngle', 'pAngle'],
			['r', 'flight voltage', 'voltage'],
			['r', 'current high', 'high'],
			['r', 'position X', 'flightX'],
			['r', 'position Y', 'flightY'],
		],
		zh: [
			[' ', '校准', 'calibrate'],
			[' ', '%d.beep 蜂鸣器', 'beeper', '打开'],
			//[' ', '起飞','armFlight'],
			//[' ', '降落','disarmFlight'],
			[' ', '起飞', 'takeOff'],
			[' ', '降落', 'autoLand'],
			[' ', ' %d.motor 电机的转速为 %d.motorPWM', 'runMotor', "M1", '0'],
			//[' ', '让飞机往 %d.flightDir 飞行 %d.xy 厘米','runDirection', "前边", '100'],
			[' ', '让飞机飞到坐标 X: %d.z , Y: %d.z ', 'position', "250", '250'],
			[' ', '让飞机往 %d.flightRotate 旋转 %d.motorPWM 度', 'runRotate', "顺时针", '30'],
			[' ', '让飞机飞到 %d.z 厘米', 'runAltitude', '100'],
			[' ', "彩灯连接接口 %d.numColor ,颜色设置为 %d.color", "setColor", "1", '黑色'],
			//[' ', "拓展接口 %d.numColor ,设置信号引脚输出为 %d.level", "setLevel", "1",'低'],
			[' ', "舵机连接接口 %d.numServo ,让舵机 %d.runServo", "setServo", "1", "正转"],
			//[' ', "火焰传感器接 %d.numADC", "setFire", "3"],
			//[' ', "红外线传感器接 %d.numADC", "setInfrared", "3"],
			//[' ', "温度传感器接 %d.numADC", "setT", "3"],
			['h', '当遥控按了 %d.key 按钮时', 'when_key', 'K5'],
			[' ', '以 %d.dirSpeed 速度往左飞', 'left_dir', '普通'],
			[' ', '以 %d.dirSpeed 速度往右飞', 'right_dir', '普通'],
			[' ', '以 %d.dirSpeed 速度往前飞', 'forward_dir', '普通'],
			[' ', '以 %d.dirSpeed 速度往后飞', 'back_dir', '普通'],
			[' ', '以 %d.dirSpeed 速度往上飞', 'up_dir', '普通'],
			[' ', '以 %d.dirSpeed 速度往下飞', 'down_dir', '普通'],
			[' ', '停', 'stop_dir'],
			[' ', '拍照', 'photo'],
			[' ', '开始录像', 'video_begin'],
			[' ', '停止录像', 'video_stop'],
			['r', '航向角', 'yAngle'],
			['r', '横滚角', 'rAngle'],
			['r', '俯仰角', 'pAngle'],
			['r', '飞机电压', 'voltage'],
			['r', '当前高度', 'high'],
			['r', '飞机X', 'flightX'],
			['r', '飞机Y', 'flightY'],
			//['r', '接口3传感器值', 'ADC_3'],
			//['r', '接口4传感器值', 'ADC_4'],
		]
	}
	var menus = {
		en: {
			onoff: ['ON', 'OFF'],
			led: ['ALL', 'A', 'B', 'C', 'D'],
			motor: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"],
			motorPWM: ['0', '30', '60', '90'],
			flightDir: ['FORWARD', "BACKWARD", "LEFT", "RIGHT"],
			flightRotate: ['CR', 'CCR'],
			color: ["BLACK", "WHITE", "RED", "ORANGE", "YELLOW", "GREEN", "BLUE", "PINK", "VIOLET"],
			beep: ["ON", "OFF", "LESS", "MEDIUM", "MORE"],
			key: ["K4", "K3", "K8", "K7"],
			speed: ["0", "20", "50", "80", "100", "125"],
			xy: ["40", "60", "80", "100", "120"],
			z: ["50", "100", "150", "200", "250"],
			dirSpeed: ["slow", "normal", "fast"],
		},
		zh: {
			onoff: ['亮', '灭'],
			led: ['所有', 'A', 'B', 'C', 'D'],
			motor: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"],
			motorPWM: ['0', '30', '60', '90'],
			flightDir: ['前边', "后边", "左边", "右边"],
			flightRotate: ['顺时针', '逆时针'],
			color: ['黑色', '白色', '红色', '橙色', '黄色', '绿色', '蓝色', '粉色', '紫色'],
			beep: ["打开", "关闭"],
			key: ["K1", "K2", "K3", "K4", "K5", "K6", "K7", "K8", "K9", "K10"],
			speed: ["0", "20", "50", "80", "100", "125"],
			xy: ["40", "60", "80", "100", "120"],
			z: ["50", "100", "150", "200", "250"],
			numColor: ["1", "3", "6", "8"],
			numServo: ["1", "3", "6", "8"],
			numADC: ["3", "4"],
			runServo: ["正转", "反转", "停止"],
			level: ['低', '高'],
			dirSpeed: ["缓慢", "普通", "快速"],
		}
	}

	ext._getStatus = function () {
		return { status: 2, msg: 'Connected' };
	};

	ext._shutdown = function () { };

	ext.video_begin = function () {
		//console.log("video begin ");
		ipcRenderer.sendToHost([protocol.video_begin]);
	};

	ext.video_stop = function () {
		//console.log("video stop ");
		ipcRenderer.sendToHost([protocol.video_stop]);
	};

	ext.photo = function () {
		//console.log("photograph ");
		ipcRenderer.sendToHost([protocol.photo]);
	};

	ext.takeOff = function () {
		//console.log("take off ");
		ipcRenderer.sendToHost([protocol.takeOff]);
	};

	ext.autoLand = function () {
		//console.log("auto land");
		ipcRenderer.sendToHost([protocol.autoLand]);
	};

	ext.calibrate = function () {
		ipcRenderer.sendToHost([protocol.calibrate]);
	};

	ext.runMotor = function (motor, speed) {
		ipcRenderer.sendToHost([Number(motor[1]) + protocol.motor_1 - 1, Number(speed)]);
	};

	ext.colorLed = function (color) {
		for (var i = 0; i < menus.en.color.length; i++) {
			if (color == menus.zh.color[i] || color == menus.en.color[i]) {
				ipcRenderer.sendToHost([protocol.color, i]);
				return;
			}
		}
	}

	ext.beeper = function (onOff) {
		console.log("beep:" + onOff);
		if (onOff == "打开") {
			ipcRenderer.sendToHost([protocol.beep, 1]);

		}
		else {
			ipcRenderer.sendToHost([protocol.beep, 2]);
		}
	}

	ext.setFire = function (port) {
		console.log("fire port:" + port);
	}
	ext.setInfrared = function (port) {
		console.log("infrared port:" + port);
	}
	ext.setT = function (port) {
		console.log("temperature port:" + port);
	}


	ext.position = function (x, y) {
		var t_x = Number(x);
		var t_y = Number(y);

		if (t_x < 0) {
			t_x = 65536 + t_x;
		}

		pos.xh = Math.floor(t_x / 256);
		pos.xl = t_x % 256;


		if (t_y < 0) {
			t_y = 65536 + t_y;
		}

		pos.yh = Math.floor(t_y / 256);
		pos.yl = t_y % 256;

		ipcRenderer.sendToHost([protocol.set_pos, pos.xl, pos.xh, pos.yl, pos.yh, 0, 0]);
	}

	ext.runRotate = function (rotate, angle) {
		console.log("run flight rotate: " + rotate + " angle: " + angle);
		var t_angle = Number(angle);
		if (t_angle > 180) {
			t_angle = 180;
		}
		else if (t_angle < 0) {
			t_angle = 0;
		}
		if (rotate == "顺时针" || rotate == "CR") {
			ipcRenderer.sendToHost([protocol.set_rotate, 1, t_angle]);
		} else if (rotate == "逆时针" || rotate == "CCR") {
			ipcRenderer.sendToHost([protocol.set_rotate, 2, t_angle]);
		}
	};

	ext.forward_dir = function (speed) {
		ipcRenderer.sendToHost([protocol.dir, 1, menus.zh.dirSpeed.indexOf(speed) + 1]);
	};
	ext.back_dir = function (speed) {
		ipcRenderer.sendToHost([protocol.dir, 2, menus.zh.dirSpeed.indexOf(speed) + 1]);
	};
	ext.left_dir = function (speed) {
		ipcRenderer.sendToHost([protocol.dir, 3, menus.zh.dirSpeed.indexOf(speed) + 1]);
	};
	ext.right_dir = function (speed) {
		ipcRenderer.sendToHost([protocol.dir, 4, menus.zh.dirSpeed.indexOf(speed) + 1]);
	};
	ext.up_dir = function (speed) {
		ipcRenderer.sendToHost([protocol.dir, 5, menus.zh.dirSpeed.indexOf(speed) + 1]);
	};
	ext.down_dir = function (speed) {
		ipcRenderer.sendToHost([protocol.dir, 6, menus.zh.dirSpeed.indexOf(speed) + 1]);
	};
	ext.stop_dir = function () {
		ipcRenderer.sendToHost([protocol.dir, 7, 0]);
	};

	ext.setColor = function (port, color) {
		for (var i = 0; i < menus.en.color.length; i++) {
			if (color == menus.zh.color[i] || color == menus.en.color[i]) {
				ipcRenderer.sendToHost([protocol.arduino, COLOR_LED, Number(port), i, 0, 0, 0, 0, 0, 0]);
				return;
			}
		}
	};

	ext.setServo = function (port, servo) {
		for (var i = 0; i < menus.zh.runServo.length; i++) {
			if (servo == menus.zh.runServo[i]) {
				ipcRenderer.sendToHost([protocol.arduino, SERVO, Number(port), i, 0, 0, 0, 0, 0, 0]);
				return;
			}
		}
	};

	ext.setLevel = function (port, level) {
		for (var i = 0; i < menus.zh.level.length; i++) {
			if (level == menus.zh.level[i]) {
				ipcRenderer.sendToHost([protocol.arduino, 0, Number(port), i, 0, 0, 0, 0, 0, 0]);
				return;
			}
		}
	};

	ext.runAltitude = function (distance) {
		console.log("run altitude " + distance);
		var t_distance = [0, 0];
		if (Number(distance) < 0) {
			distance = 0;
		}
		else {
			t_distance[0] = Number(distance);
		}
		pos.zl = t_distance[0] % 256;
		pos.zh = Math.floor(t_distance[0] / 256);
		ipcRenderer.sendToHost([protocol.set_pos, 0, 0, 0, 0, pos.zl, pos.zh]);
	};

	/* var port = chrome.runtime.connect(googleKey,{name: "Ghost2"});

	port.onMessage.addListener(function(msg) {
		//console.log(msg);
		
		if ((msg.lang != lang) && (msg.lang != undefined))
		{
			lang = msg.lang;
			// Block and block menu descriptions	
			var descriptor = {
				blocks: blocks[lang],
				menus: menus[lang],
				url: 'http://www.makerfire.com/'
			};

			// Register the extension
			if(ScratchExtensions.getStatus('Ghost2').status == 0)
			{
				ScratchExtensions.register('Ghost2', descriptor, ext);
			}
			else
			{
				ScratchExtensions.unregister('Ghost2', descriptor, ext);
				ScratchExtensions.register('Ghost2', descriptor, ext);
			}			
		}	
		else if(msg.pitchAngle != undefined)
		{
			dataPackage = msg;
			
		}
		
	}); */

	ext.pAngle = function () {
		return dataPackage.pitch;
	};
	ext.yAngle = function () {

		return dataPackage.yaw;
	};
	ext.rAngle = function () {
		return dataPackage.roll;
	};
	ext.voltage = function () {
		return dataPackage.vol;
	};
	ext.high = function () {
		return dataPackage.z;
	};
	ext.flightX = function () {
		return dataPackage.x;
	};
	ext.flightY = function () {
		return dataPackage.y;
	};

	ext.when_key = function (key) {

		if (dataPackage.remoteKey != 0) {
			var index = menus.zh.key.indexOf(key) + 1;
			console.log("user press key:" + dataPackage.remoteKey + " choose index:" + index);
			if (index === dataPackage.remoteKey) {
				dataPackage.remoteKey = 0;
				return true;
			}
		}
		return false;
	};

	var descriptor = {
		blocks: blocks["zh"],
		menus: menus["zh"],
		url: 'http://www.makerfire.com/'
	};

	ScratchExtensions.register('Ghost2', descriptor, ext);
};