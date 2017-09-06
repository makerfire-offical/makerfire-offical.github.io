/*	*/

var googleKey = 'fjplhgbgoondbapbljoeppadnkfdmold';
var scratchData = [0, 0];
var dataPackage = {
	arm:0,
	motor_1:1,
	motor_2:2,
	motor_3:3,
	motor_4:4,
	motor_5:5,
	motor_6:6,
	motor_7:7,
	motor_8:8,
	axis:9,	
	calibrate:10,
	color:11,
	beep:12,
	version:13,
	get_flightData:14,
	set_x:15,
	set_y:16,
	set_z:17,
	set_rotate:18,
	dir:19,
};

(function(ext){
    var connected = false;
    var notifyConnection = false;
	var trimPitch = 0;
	var trimRoll = 0;
	var userKey = 0;
	var timerId = -1;
	var lang = "test";

	var blocks = {
		en:[
			[' ', 'Calibrate', 'calibrate'],
            [' ', 'LED %d.led %d.onoff','runLed','ALL','ON'],
			[' ', 'colorLight %d.color','colorLed','BLACK'],
			[' ', 'buzzer buzz %d.beep','beeper',"OFF"],
            [' ', 'Arm Flight','armFlight'],
			[' ', 'Disarm Flight','disarmFlight'],
            [' ', 'Set %d.motor speed %d.speed' ,'runMotor', "M1", '30'],
            [' ', 'Set go %d.flightDir at speed %d.speed','runDirection', "Forward", '100'],
            [' ', 'Set rotate %d.flightRotate at speed %d.speed','runRotate', "CR", '100'],
            [' ', 'Set altitude at speed %d up','runAltitude','100'],
			['h', "when pressed the remote keys %d.key", 'when_key', 'U1'],
			['r', 'Throttle', 'thr'],
			['r', 'Pitch', 'pitch'],
			['r', 'Roll', 'roll'],
			['r', 'Yaw', 'yaw'],
			['r', 'YawAngle', 'yAngle'],
			['r', 'RollAngle', 'rAngle'],
			['r', 'PitchAngle', 'pAngle'],
			['r', 'flight voltage', 'voltage'],
			['r', 'current high', 'high'],
		],
		zh:[
			[' ', '校准', 'calibrate'],
			[' ', '让彩色灯亮 %d.color','colorLed','黑色'],
			[' ', '%d.beep 蜂鸣器','beeper','打开'],
            [' ', '电机解锁','armFlight'],
			[' ', '电机上锁','disarmFlight'],
            [' ', ' %d.motor 电机的转速为 %d.motorPWM','runMotor', "M1", '0'],
            [' ', '让飞机往 %d.flightDir 飞行 %d.xy 厘米','runDirection', "前边", '100'],
            [' ', '让飞机往 %d.flightRotate 旋转 %d.speed 度','runRotate', "顺时针", '100'],
            [' ', '让飞机飞到 %d.z 厘米','runAltitude','100'],
			['h', '当遥控按了 %d.key 按钮时', 'when_key', 'K4'],
			[' ', '左飞','left_dir'],
			[' ', '右飞','right_dir'],
			[' ', '前飞','forward_dir'],
			[' ', '后飞','back_dir'],
			[' ', '中间','center_dir'],
			['r', '航向角', 'yAngle'],
			['r', '横滚角', 'rAngle'],
			['r', '俯仰角', 'pAngle'],
			['r', '飞机电压', 'voltage'],
			['r', '当前高度', 'high'],
		]
	}
	var menus = {
		en:{
			onoff: ['ON', 'OFF'],
            led:['ALL','A','B','C','D'],
            motor:["M1","M2","M3","M4","M5","M6","M7","M8"],
			motorPWM:['0','30','60','90'],
            flightDir:['FORWARD',"BACKWARD","LEFT","RIGHT"],
            flightRotate:['CR','CCR'],
			color:["BLACK","WHITE","RED","ORANGE","YELLOW","GREEN","BLUE","PINK","VIOLET"],
			beep:["ON","OFF","LESS","MEDIUM","MORE"],
			key:["K4","K3","K8","K7"],
			speed:["0","20","50","80","100","125"],
			xy:["40", "60", "80", "100", "120"],
			z:["50", "100", "150", "200", "250"],
		},
		zh:{
			onoff: ['亮', '灭'],
            led:['所有','A','B','C','D'],
            motor:["M1","M2","M3","M4","M5","M6","M7","M8"],
            motorPWM:['0','30','60','90'],
            flightDir:['前边',"后边","左边","右边"],
            flightRotate:['顺时针','逆时针'],
			color:['黑色','白色','红色','橙色','黄色','绿色','蓝色','粉色','紫色'],
			beep:["打开","关闭"],
			key:["K4","K3","K8","K7"],
			speed:["0","20","50","80","100","125"],
			xy:["40", "60", "80", "100", "120"],
			z:["50", "100", "150", "200", "250"],
		}
	}

    ext._getStatus = function() {
		return { status:2, msg:'Connected' };
    };

    ext.armFlight = function(){
        //console.log("arm flight ");
		scratchData = [dataPackage.arm, 1];
		chrome.runtime.sendMessage(googleKey, scratchData, processInput);
    };
	
	ext.disarmFlight = function(){
        //console.log("disarm flight ");
		scratchData = [dataPackage.arm, 0];
		chrome.runtime.sendMessage(googleKey, scratchData, processInput);
    };

    ext.calibrate = function(){
		scratchData = [dataPackage.calibrate, 1];
		chrome.runtime.sendMessage(googleKey, scratchData, processInput);
		scratchData = [dataPackage.calibrate, 0];
		chrome.runtime.sendMessage(googleKey, scratchData, processInput);
    };

    ext.runMotor =  function(motor, speed){
        //console.log("run motor "+motor+" "+speed);
		speed = Number(speed);
		motorNum = Number(motor[1]) + dataPackage.motor_1 - 1;
		scratchData = [motorNum, speed];
		chrome.runtime.sendMessage(googleKey, scratchData, processInput);
    };

    ext.runLed = function(led,onoff){
        console.log("run led "+led+" "+onoff);
    };
	
	ext.colorLed = function(color){
		console.log("color:" + color);

		for(var i = 0; i < menus.en.color.length; i++)
		{
			if(color == menus.zh.color[i] || color == menus.en.color[i]){
				scratchData = [dataPackage.color, i];
				chrome.runtime.sendMessage(googleKey, scratchData, processInput);
				return;
			}
		}
	}
	
	ext.beeper = function(onOff){
		console.log("beep:"+onOff);
		if(onOff == "打开")
		{
			scratchData = [dataPackage.beep, 1];
		}
		else
		{
			scratchData = [dataPackage.beep, 0];
		}
		chrome.runtime.sendMessage(googleKey, scratchData, processInput);

		//sendMsg({'proto':'beeper','time':time});
	}
	
	ext.runDirection = function(dir,distance) {
		console.log("run flight direction "+dir+" "+distance);
		var t_xy = -1;
		var t_distance = 127;
		if(Number(distance) > 127)
		{
			distance = 127;
		}
		else if(Number(distance) < 0)
		{
			distance = 0;
		}
		if(dir == "FORWARD" || dir == "前边")
		{
			t_xy = dataPackage.set_y;
			t_distance += Number(distance);
		}
		else if(dir == "BACKWARD" || dir == "后边")
		{
			t_xy = dataPackage.set_y;
			t_distance -= Number(distance);
		}
		else if(dir == "LEFT" || dir == "左边")
		{
			t_xy = dataPackage.set_x;
			t_distance -= Number(distance);
		}
		else if(dir == "RIGHT" || dir == "右边")
		{
			t_xy = dataPackage.set_x;
			t_distance += Number(distance);
		}
		scratchData = [t_xy, t_distance];
		chrome.runtime.sendMessage(googleKey, scratchData, processInput);
	};
	
	ext.runRotate = function(rotate,angle) {
		console.log("run flight rotate: "+rotate+" angel: "+angle);
		if(rotate == "顺时针" || rotate == "CR"){
			scratchData = [dataPackage.set_rotate, 127 + Math.round(Number(angle)/3)];
		}else if(rotate == "逆时针" || rotate == "CCR"){
			scratchData = [dataPackage.set_rotate, 127 - Math.round(Number(angle)/3)];
		}
		chrome.runtime.sendMessage(googleKey, scratchData, processInput);
	};
	
	ext.forward_dir = function(){
		chrome.runtime.sendMessage(googleKey, [dataPackage.dir, 1], processInput);
	};
	ext.back_dir = function(){
		chrome.runtime.sendMessage(googleKey, [dataPackage.dir, 2], processInput);
	};
	ext.left_dir = function(){
		chrome.runtime.sendMessage(googleKey, [dataPackage.dir, 3], processInput);
	};
	ext.right_dir = function(){
		chrome.runtime.sendMessage(googleKey, [dataPackage.dir, 4], processInput);
	};
	ext.center_dir = function(){
		chrome.runtime.sendMessage(googleKey, [dataPackage.dir, 0], processInput);
	};
	
	ext.runAltitude = function(distance) {
		console.log("run altitude "+distance);
		if(Number(distance) > 250)
		{
			distance = 250;
		}
		else if(Number(distance) < 0)
		{
			distance = 0;
		}
		scratchData = [dataPackage.set_z, Number(distance)];
		chrome.runtime.sendMessage(googleKey, scratchData, processInput);
	};
	
	var flightData = new Object();
	var port = chrome.runtime.connect(googleKey,{name: "Ghost"});

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
			if(ScratchExtensions.getStatus('Ghost').status == 0)
			{
				ScratchExtensions.register('Ghost', descriptor, ext);
			}
			else
			{
				ScratchExtensions.unregister('Ghost', descriptor, ext);
				ScratchExtensions.register('Ghost', descriptor, ext);
			}			
			timerId = window.setInterval(toDo5Hz, 200);
		}	
		else if((msg.serial == "close") && (msg.serial != undefined))
		{
			window.clearInterval(timerId);
		}
		else if((msg.serial == "open") && (msg.serial != undefined))
		{
			timerId = window.setInterval(toDo5Hz, 200);
		}
		else
		{
			flightData = msg;
		}
		
	});

	ext.pAngle = function() {
		var y = flightData[8] + flightData[9]*256;
		y = y > 32767 ? (y - 65536)/10 : y/10;
		return y;
	};
	ext.yAngle = function() {
		var z = flightData[10] + flightData[11]*256;
		z = z > 32767 ? (z - 65536)/10 : z/10;
		return z;
	};
	ext.rAngle = function() {
		var x = flightData[6] + flightData[7]*256;
		x = x > 32767 ? (x - 65536)/10 : x/10;
		return x;
	};
	ext.voltage = function() {
		var V = flightData[12]/10;
		return V;
	};
	ext.high = function() {
		//var high = flightData[4] + flightDataa[5]*256;
		//high = high > 32767 ? (high - 65536)/10 : high/10;
		return flightData[4];
	};
	
	ext.altMode = function(altFlag) {
		if(altFlag == '打开'){
			sendMsg({'proto':'altMode','mode':'OPEN'});
		}else if(altFlag == '关闭'){
			sendMsg({'proto':'altMode','mode':'CLOSE'});
		}else{
			sendMsg({'proto':'altMode','mode':altFlag});
		}
	};
	ext.when_key = function(key){
		console.log("choose key:"+key);
		if(flightData.key != userKey)
		{
			var tmpKey = 0;
			
			userKey = flightData.key;
			console.log("user press key:"+userKey);
			if(userKey == "1")
			{
				tmpKey = 4;
			} else if(userKey == "2")
			{
				tmpKey = 3;
			} else if(userKey == "3")
			{
				tmpKey = 8;
			} else if(userKey == "4")
			{
				tmpKey = 7;
			}
			if(key === ("K"+tmpKey)){
				return true;
			}
		}
		
		return false;
	};

    function processInput(msg) {
		if(msg && connected == false)
		{
			connected = true;
		}
		else
		{
			connected = false;
			window.clearInterval(timerId);
		}
    }
	
    function toDo5Hz(){
		scratchData[0] = dataPackage.get_flightData;
		chrome.runtime.sendMessage(googleKey, scratchData, processInput);
	}

})({});




