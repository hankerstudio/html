function $(id){ return document.getElementById(id); }

//调用 await sleep(100);
function sleep(ms) {
    // 校验参数：确保ms是正数
    if (typeof ms !== 'number' || ms < 0) {
        ms = 0;
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

//设置cookie
function setCookie(key, val, time){
    var date = new Date(new Date().getTime()+ time*24*60*60*1000).toUTCString();
    var cookie_path = window.location.pathname;
    cookie_path = cookie_path.substring(0, cookie_path.lastIndexOf('/') + 1);
    document.cookie = key+"="+val+"; expires="+ date +"; path="+ cookie_path;
}
//读取cookie
function getCookie(key){ 
  var rlt = document.cookie.match( new RegExp("(^|\\s)"+ key +"=([^;]+)(;|$)"));
  return rlt == null ? -1 : rlt[2];
}
//删除cookie
function delCookie(key){ setCookie(key, -1, -1); }


// 游戏核心类
class CodeWorldGame {
    //gi:当前关数, px,py:机器人坐标, cx,xy:星星坐标
    constructor(gi,bc1,bc2,px,py,cx,cy,pts) {
        // 获取DOM元素
        this.canvas = $('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.victoryModal = $('victoryModal');
        this.restartBtn = $('restartBtn');
        this.closeBtn = $('closeBtn');
        
        // 游戏配置
        this.config = {
            gravity: 0.8,
            jumpForce: -14,
            moveSpeed: 3,
            friction: 0.85,
            canvasWidth: 1176,
            canvasHeight: 664,
            mousex: 0,
            mousey: 0,
            aniID: 0, //动画执行ID
            gamei: gi,
            bgc1: bc1, //界面背景?
            bgc2: bc2, //界面背景深
        };
        
        //this.canvas.width = this.config.canvasWidth;
        //this.canvas.height = this.config.canvasHeight;
                        
        // 游戏状态
        this.gameState = {
            isRunning: true,
            hasWon: false,
            keys: {
                left: false,
                right: false,
                up: false,
                down: false,
                space: false,
                shift: false,
                ctrl: false,
                enter: false,
                esc: false
            }
        };
        
        // 游戏元素
        this.player = {
            x: px,
            y: py,
            width: 80,
            height: 80,
            velocityX: 0,
            velocityY: 0,
            isGrounded: false,
            state: 'grounded',
            color: '#0066ff',
            border: '#f00'
        };
        
        // 收集物（紫色星星）
        this.collectible = {
            x: cx,
            y: cy,
            size: 75,
            color: '#9900ff',
            collected: false
        };
                        
        // 平台配置（还原截图中的平台布局）
        //fns:[['可用方法名','方块名称','方块value值','其它自定义变量',...],['可用方法名','其它自定义变量',...],...]
        this.platforms = pts;
        
        // 背景装饰元素
        this.backgroundElements = [];
        this.initBackgroundElements();
        
        // 消息炮弹框 (不支持同时多个)
        // dir 0:up 1:right(default), 2:down, 3:left
        //this.msg = {x: 0,y: 0,width: 100,height: 50,pt: null,dir: '1',msg: '',bgcolor: '#52062e',color: '#fa5aa8',font: '24px bold serif'}
        // 消息炮弹框 (支持同时多个)
        this.msgs = [];
        
        // 初始化事件监听
        this.initEventListeners();
        
        this.thread();
        
        // 开始游戏循环
        this.gameLoop();
    }
    
    // 定时器
    thread() {
        ;
    }
    
    // 消息框碰撞后事件处理
    showRlt(pt, msg) {
        ;
    }
            
    gcd(a, b) { //递归求最大公约数
        if (b === 0) { return a; }
        return this.gcd(b, a % b);
    }
            
    isValid(s) { //括号是否合法
        const obj ={
            "(":")"//,
            //"{":"}",
            //"[":"]"
        } 
        let stack = [];
        for(let i =0;i<s.length;i++){
            if(s[i] in obj ){
                stack.push(s[i])
            }else if(s[i] !== obj[stack[stack.length - 1]]){
                return false
            }else{
                stack.pop()
            }
        }
        return stack.length === 0 
    };
    
    random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    getPFbyName(name) {
        let pt = -1;
        this.platforms.forEach((p, index) => {
            if(p.hasOwnProperty('fns') && (p.fns != null) && (p.fns[0][1] == name)){
                pt = index;
            }
        });
        return pt;
    }
    
    send(pt, dir, msg) {
        if(dir == 'up') dir = '0';
        else if(dir == 'right') dir = '1';
        else if(dir == 'down') dir = '2';
        else if(dir == 'left') dir = '3';
        this.setMsg(pt, msg, dir);
    }
    
    send_to(pt, msg) {
        this.showRlt(pt, msg);
    }
    
    move(pt, dir, num, cb=null) {
        var i = 0;
        var spd = this.config.moveSpeed;
        var player = this.player;
        var itv = setInterval(function(){
            if(dir == 'left'){
                pt.x -= spd;
            }else if(dir == 'right'){
                pt.x += spd;
            }else if(dir == 'up'){
                if((player.x+player.width >= pt.x) &&
                   (player.x < pt.x + pt.width) &&
                   (player.y + player.height == pt.y)
                ){
                    player.y -= spd; //如果机器人在方块上,则同步上移
                }
                pt.y -= spd;
            }else if(dir == 'down'){
                pt.y += spd;
            }
            if(i++ > num / 4) {
                clearInterval(itv);
                itv = null;
                if(cb != null) cb();
            }
        },50);
    }
    
    show(cc) {
        $('codev').innerHTML = cc;
        $('code').style.display = 'block';
    }
    
    edit(cc, pti) {
        $('codev').innerHTML = cc;
        $('codev').setAttribute('contenteditable', true);
        $('codev').setAttribute('pti', pti);
        $('code').style.display = 'block';
    }
    
    hasFun(fns, fn){
        var rlt = -1;
        if(fns != null)
        for(var i=0; i<fns.length; i++){
            if(fn == fns[i][0]){
                rlt = i;
            } else if( fns[i][0].indexOf('(') == 0){ //需要匹配类型
                var reg = new RegExp(fns[i][0]);
                if(reg.test(fn)){
                  rlt = i;
                }
            }
        };
        return rlt;
    }
    
    format() {
        var a, b, c;
        a = arguments[0];
        b = [];
        for(c = 1; c < arguments.length; c++){
            b.push(arguments[c]);
        }
        for (c in b) {
            a = a.replace(/%[a-z]/, b[c]);
        }
        return a;
    }
  
    destroy(i){
        this.platforms[i].des = true;
    }
    
    // 初始化背景装饰元素
    initBackgroundElements() {
        // 创建背景建筑轮廓
        for (let i = 0; i < 5; i++) {
            this.backgroundElements.push({
                x: 200 + i * 250,
                y: 100,
                width: 150 + Math.random() * 100,
                height: 300 + Math.random() * 150,
                opacity: 0.1 + Math.random() * 0.15
            });
        }
        
        // 创建云朵
        for (let i = 0; i < 8; i++) {
            this.backgroundElements.push({
                type: 'cloud',
                x: Math.random() * this.config.canvasWidth,
                y: 50 + Math.random() * 100,
                size: 50 + Math.random() * 80,
                opacity: 0.7 + Math.random() * 0.2
            });
        }
    }
    
    // 初始化事件监听
    initEventListeners() {
        // 键盘按下事件
        window.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'Control':
                    this.gameState.keys.ctrl = true;
                    break;
                case 'ArrowLeft':
                    this.gameState.keys.left = true;
                    break;
                case 'ArrowRight':
                    this.gameState.keys.right = true;
                    break;
                case 'ArrowUp':
                    this.gameState.keys.up = true;
                    break;
                case 'ArrowDown':
                    this.gameState.keys.down = true;
                    break;
                case ' ':
                    if(!this.gameState.keys.enter && ($('code').style.display != 'block')) this.gameState.keys.space = true;
                    break;
                case 'Shift':
                    if(($('code').style.display == 'block') || ($('msg').style.display == 'block')) break;
                    this.gameState.keys.shift = true;
                    this.restartGame();
                    break;
                case 'Enter':
                    if(this.gameState.keys.enter == false){
                        if($('code').style.display == 'block') break;
                        this.gameState.keys.enter = true;
                        $('val').value = "";
                        $('msg').style.display='block';
                        $('dir'+$('dir').value).style.background='red';
                        $('val').focus();
                    } else {
                        this.gameState.keys.enter = false;
                        $('msg').style.display='none';
                        this.setMsg(this.player, $('val').value, $('dir').value);
                    }
                    break;
                case 'Escape':
                    this.gameState.keys.esc = true;
                    this.gotoMain();
                    break;
            }
        });
        
        // 键盘释放事件
        window.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'Control':
                    this.gameState.keys.ctrl = false;
                    break;
                case 'ArrowLeft':
                    this.gameState.keys.left = false;
                    break;
                case 'ArrowRight':
                    this.gameState.keys.right = false;
                    break;
                case 'ArrowUp':
                    this.gameState.keys.up = false;
                    break;
                case 'ArrowDown':
                    this.gameState.keys.down = false;
                    break;
                case ' ':
                    if(!this.gameState.keys.enter) this.gameState.keys.space = false;
                    break;
                case 'Shift':
                    this.gameState.keys.shift = false;
                    break;
                case 'Enter':
                    //this.gameState.keys.enter = false;
                    break;
                case 'Escape':
                    this.gameState.keys.esc = false;
                    break;
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.config.mousex = (e.clientX - rect.left) * this.canvas.width / rect.width;
            this.config.mousey = (e.clientY - rect.top) * this.canvas.height / rect.height
        });
        
        // 重启按钮点击事件
        this.restartBtn.addEventListener('click', () => {
            this.gotoMain();
        });
        
        // 代码框关闭
        this.closeBtn.addEventListener('click', () => {
            var pti = parseInt($('codev').getAttribute('pti'));
            if($('codev').getAttribute('contenteditable')){
                //校验新增代码的合法性 
                //获取可用方法名
                var code = this.platforms[pti].code.replace(/ /g, '');
                code = code.substr(code.indexOf('edit(')+5);
                code = code.substr(0,code.indexOf(')'));
                //获取当前方法名
                var code1 = $('codev').innerHTML.replace(/&nbsp;/g, ' ');
                var arr = this.extractFunctionNames(code1);
                //验证新加的方法是否在允许里面
                for(var i=0; i<arr.length; i++){
                    var fn = '"'+arr[i]+'"';
                    if(code.indexOf(fn)<0){
                        alert('代码不合法,请重新修改~');
                        return;
                    }
                }
            }
            $('code').style.display='none';
            if($('codev').getAttribute('contenteditable')){
                $('codev').removeAttribute('contenteditable');
                this.platforms[pti].code = $('codev').innerHTML.replace(/'/g, '"');
            }
        });
    }
    
    /**
     * 从代码文本中提取所有符合规则的函数名（兼容函数名与括号间有空格）
     * @param {string} codeText - 待匹配的代码文本
     * @returns {string[]} 去重后的函数名列表
     */
    extractFunctionNames(codeText) {
        // 正则表达式解析：
        // (?<!\w)        负向断言：函数名前不是字母/数字/下划线（非字母/符号/空格之后）
        // ([a-zA-Z]+)    捕获组：纯英文字母组成的函数名
        // \s*            匹配零个或多个空格（兼容函数名和括号间有空格的情况）
        // (?=\()         正向断言：确保空格后紧跟左括号
        const funcNameRegex = /(?<!\w)([a-zA-Z_]+)\s*(?=\()/g;
        const matches = [];
        let match;

        // 循环匹配所有符合条件的结果
        while ((match = funcNameRegex.exec(codeText)) !== null) {
            matches.push(match[1]); // 提取捕获组中的函数名
        }

        // 去重并返回
        return [...new Set(matches)];
    }
    
    setMsg(pt, msg, dir, canTouchSelf = false) {
        if(msg == '') return;
        var x = pt.x;
        var y = pt.y;
        var w = msg.length * 12 + 15 + 15;
        var h = 50;
        x += (pt.width - w) / 2;
        y += (pt.height - h) / 2;
        if(canTouchSelf){ //当消息块允许与发送者相碰时,需要先让消息块初始时不碰到发送者
            if(dir == '0'){
                y = pt.y - h;
            }else if(dir == '1'){
                x = pt.y + pt.width + w;
            }else if(dir == '2'){
                y = pt.y + pt.height;
            }else if(dir == '3'){
                x = pt.x - w;
            }
        }
        var one_msg = {x:x,y:y,width:w,height:h,pt:pt,dir:dir,msg:msg,cts:canTouchSelf,bgcolor:'#52062e',color:'#fa5aa8',font:'24px bold serif'};
        this.msgs.push(one_msg);
    }
    
    // msg
    makeMsg() {
        this.msgs.forEach(amsg => {
            var msg = amsg.msg;
            var x = amsg.x;
            var y = amsg.y;
            var w = amsg.width;
            var h = amsg.height;
            this.fillRoundRect(this.ctx, x, y, w, h, 5, amsg.bgcolor);
            this.ctx.font = amsg.font;
            this.ctx.fillStyle = amsg.color;
            this.ctx.fillText(msg, x+15, y+32);
        });
    }
    
    // 更新游戏逻辑
    update() {
        if (!this.gameState.isRunning || this.gameState.hasWon) return;
        
        // 玩家移动逻辑
        this.updatePlayer();
        
        // 碰撞检测
        this.checkCollisions();
        
        // 检查收集物
        this.checkCollectible();
        
        // 边界检测
        this.checkBoundaries();
    }
    
    // 更新玩家状态
    updatePlayer() {
        if(this.gameState.keys.ctrl) return;
        // 水平移动
        if (this.gameState.keys.left) {
            this.player.velocityX = -this.config.moveSpeed;
        } else if (this.gameState.keys.right) {
            this.player.velocityX = this.config.moveSpeed;
        } else {
            // 摩擦力
            this.player.velocityX *= this.config.friction;
        }
        
        // 跳跃逻辑
        if ((this.gameState.keys.space || this.gameState.keys.up) && this.player.isGrounded) {
            this.player.velocityY = this.config.jumpForce;
            this.player.isGrounded = false;
            this.player.state = 'jump';
        }
        // 应用重力
        this.player.velocityY += this.config.gravity;
        //if(this.player.velocityY >= -this.config.jumpForce) this.player.velocityY = 0;
        if(this.player.velocityY > 0.8){
            this.player.state = 'falling';
        }
        
        
        // 更新位置
        this.player.x += this.player.velocityX;
        this.player.y += this.player.velocityY;
        this.player.x = parseFloat(this.player.x.toFixed(2));
        this.player.y = parseFloat(this.player.y.toFixed(2));
        
        // 重置地面状态
        this.player.isGrounded = false;
    }
    
    updateMsg() {
        if(this.gameState.keys.ctrl && this.gameState.keys.enter){ //按下了ctrl键+方向键可以改msg方向
            if (this.gameState.keys.left) {
                $('dir'+$('dir').value).style.background='';$('dir3').style.background='red';$('dir').value='3';
            } else if (this.gameState.keys.right) {
                $('dir'+$('dir').value).style.background='';$('dir1').style.background='red';$('dir').value='1';
            } else if(this.gameState.keys.up) {
                $('dir'+$('dir').value).style.background='';$('dir0').style.background='red';$('dir').value='0';
            } else if (this.gameState.keys.down) {
                $('dir'+$('dir').value).style.background='';$('dir2').style.background='red';$('dir').value='2';
            }
            if(($('val').value != '') && (
              this.gameState.keys.left || 
              this.gameState.keys.right || 
              this.gameState.keys.up || 
              this.gameState.keys.down)) {
                this.gameState.keys.enter = false;
                $('msg').style.display='none';
                this.setMsg(this.player, $('val').value, $('dir').value);
            }
        }
        this.msgs.forEach(amsg => {
            var dir = amsg.dir;
            if(dir == '0') {
                amsg.y -= this.config.moveSpeed;
            }else if(dir == '1') {
                amsg.x += this.config.moveSpeed;
            }else if(dir == '2') {
                amsg.y += this.config.moveSpeed;
            }else if(dir == '3') {
                amsg.x -= this.config.moveSpeed;
            }
            
            // 碰撞检测
            var pt = null;
            var msg = '';
            this.platforms.forEach(platform => {
                if(platform.des || (platform.title != '门') || ((platform == amsg.pt) && !amsg.cts)) return;//
                if (
                    (amsg.x + amsg.width / 2 < platform.x + platform.width) &&
                    (amsg.x + amsg.width / 2 > platform.x) &&
                    (amsg.y + amsg.height / 2 < platform.y + platform.height) &&
                    (amsg.y + amsg.height / 2 > platform.y)
                ) { //消息体的中间部分去碰方块
                    msg = amsg.msg;
                    this.msgs = this.msgs.filter(item => item !== amsg); //碰到方块,移除
                    pt = platform;
                }
            });
            
            // 边界检测
            if ((amsg.msg != '') && ((amsg.x < 0) && (amsg.dir == '3') || // 左边界
               (amsg.x + amsg.width > this.config.canvasWidth) && (amsg.dir == '1') || // 右边界
               (amsg.y > this.config.canvasHeight) && (amsg.dir == '2') || // 下边界
               (amsg.y < 0) && (amsg.dir == '0'))) { // 上边界
                msg = amsg.msg;
                this.msgs = this.msgs.filter(item => item !== amsg); //出边界了,移除
            }
            
            this.showRlt(pt, msg);
        });
    }
    
    // 碰撞检测
    checkCollisions() {
        // 平台碰撞检测
        this.platforms.forEach(platform => {
            if(platform.des) return;
            // 简单的AABB碰撞检测
            if (
                this.player.x < platform.x + platform.width &&
                this.player.x + this.player.width > platform.x &&
                this.player.y < platform.y + platform.height &&
                this.player.y + this.player.height > platform.y
            ) {
                // 从上方向下碰撞（落地）
                if (this.player.velocityY > 0 && 
                    this.player.y + this.player.height <= platform.y + 15) {
                    this.player.y = platform.y - this.player.height;
                    this.player.velocityY = 0;
                    this.player.isGrounded = true;
                    this.player.state = 'grounded';
                }
                // 从下方向上碰撞（头顶撞到平台）
                else if (this.player.velocityY < 0 &&
                         this.player.y >= platform.y + platform.height - 10) {
                    this.player.y = platform.y + platform.height;
                    this.player.velocityY = 0;
                }
                // 左右碰撞
                else if (this.player.velocityX !== 0) {
                    if (this.player.x < platform.x) {
                        this.player.x = platform.x - this.player.width;
                    } else {
                        this.player.x = platform.x + platform.width;
                    }
                    this.player.velocityX = 0;
                }
            }
        });
    }
    
    // 检查收集物碰撞
    checkCollectible() {
        if (this.collectible.collected) return;
        
        // 简单的圆形碰撞检测（星星）
        const dx = this.player.x + this.player.width/2 - (this.collectible.x + this.collectible.size/2);
        const dy = this.player.y + this.player.height/2 - (this.collectible.y + this.collectible.size/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if ((distance < (this.player.width/2 + this.collectible.size/2)) &&
            (this.player.x >= this.collectible.x - this.player.width) && 
            (this.player.x <= this.collectible.x + this.collectible.size) &&
            (this.player.y >= this.collectible.y - this.player.height) &&
            (this.player.y <= this.collectible.y + this.player.height + this.collectible.size)
        ){
            this.collectible.collected = true;
            this.gameState.hasWon = true;
            let gi = getCookie("hk_cw_game_h5");
            if(gi <= this.config.gamei) setCookie("hk_cw_game_h5", this.config.gamei+1, 365);
            this.victoryModal.style.display = 'flex';
        }
    }
    
    // 边界检测
    checkBoundaries() {
        // 左边界
        if (this.player.x < 0) {
            this.player.x = 0;
        }
        
        // 右边界
        if (this.player.x + this.player.width > this.config.canvasWidth) {
            this.player.x = this.config.canvasWidth - this.player.width;
        }
        
        // 下边界（掉落）
        if (this.player.y > this.config.canvasHeight) {
            this.restartGame();
        }
        
        // 上边界
        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.velocityY = 0;
        }
    }
    
    // 渲染游戏画面
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
        
        // 绘制背景
        this.renderBackground();
        
        // 绘制玩家
        if(this.player.x>=0) this.renderPlayer();
        
        // 绘制收集物
        if (!this.collectible.collected) {
            if(this.player.x>=0) this.renderCollectible();
        }
        
        // 绘制平台
        if(this.player.x>=0) this.renderPlatforms();
        
        // 绘制装饰元素
        if(this.player.x>=0) this.renderDecorations();
        
        this.makeMsg();
    }
    
    // 绘制背景
    renderBackground() {
        // 渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.config.canvasHeight);
        gradient.addColorStop(0, this.config.bgc1);
        gradient.addColorStop(1, this.config.bgc2);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
        
        // 绘制背景元素
        this.backgroundElements.forEach(element => {
            if (element.type === 'cloud') {
                // 绘制云朵
                this.ctx.fillStyle = `rgba(255, 255, 255, ${element.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(element.x, element.y, element.size/3, 0, Math.PI * 2);
                this.ctx.arc(element.x + element.size/4, element.y - element.size/5, element.size/3, 0, Math.PI * 2);
                this.ctx.arc(element.x + element.size/2, element.y, element.size/3, 0, Math.PI * 2);
                this.ctx.arc(element.x + element.size/4, element.y + element.size/5, element.size/3, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // 绘制建筑轮廓
                this.ctx.fillStyle = `rgba(0, 100, 200, ${element.opacity})`;
                this.ctx.fillRect(element.x, element.y, element.width, element.height);
                
                // 建筑细节
                this.ctx.strokeStyle = `rgba(0, 150, 255, ${element.opacity * 0.8})`;
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(element.x, element.y, element.width, element.height);
                
                // 建筑窗户
                this.ctx.fillStyle = `rgba(0, 200, 255, ${element.opacity * 0.5})`;
                for (let i = 0; i < 5; i++) {
                    for (let j = 0; j < 8; j++) {
                        const windowX = element.x + 20 + i * 25;
                        const windowY = element.y + 20 + j * 30;
                        if (windowX < element.x + element.width - 20 && 
                            windowY < element.y + element.height - 20) {
                            this.ctx.fillRect(windowX, windowY, 15, 15);
                        }
                    }
                }
            }
        });
    }
    
    // 绘制平台
    renderPlatforms() {
        this.platforms.forEach(platform => {
            if(platform.des) return;
            // 主平台颜色
            this.fillRoundRect(this.ctx, platform.x, platform.y, platform.width, platform.height, 10, platform.color);
            // 平台轮廓
            this.strokeRoundRect(this.ctx, platform.x, platform.y, platform.width, platform.height, 10, 10, platform.border);
            // 平台提示信息
            if(platform.hasOwnProperty('fns') && (platform.fns != null) && (platform.fns[0].length >= 3) &&
            (platform.x <= this.config.mousex) && (platform.x + platform.width >= this.config.mousex) &&
            (platform.y + platform.height >= this.config.mousey) && (platform.y <= this.config.mousey)) {
                var x = this.config.mousex;
                var y = this.config.mousey;
                var l = (''+platform.fns[0][1]).length;
                var l1 = (''+platform.fns[0][2]).length;
                l = l1 > l ? l1 : l;
                var w = ((l < 4 ? 4 : l) + 7) * 15;
                var h = 100;
                this.fillRoundRect(this.ctx, x, y, w, h, 8, '#001B1B');
                this.strokeRoundRect(this.ctx, x, y, w, h, 8, '#0A373F');
                this.ctx.font = '24px bold serif';
                this.ctx.fillStyle = '#34CFBE';
                this.ctx.fillText('name: '+platform.fns[0][1], x+15, y+35);
                this.ctx.fillText('value: '+platform.fns[0][2], x+15, y+70);
            }
        });
    }

    fillRoundRect(cxt, x, y, width, height, radius, /*optional*/ fillColor) {
        //圆的直径必然要小于矩形的宽高          
        if (2 * radius > width || 2 * radius > height) { return false; }
 
        cxt.save();
        cxt.translate(x, y);
        //绘制圆角矩形的各个边  
        this.drawRoundRectPath(cxt, width, height, radius);
        cxt.fillStyle = fillColor || "#000"; //若是给定了值就用给定的值否则给予默认值  
        cxt.fill();
        cxt.restore();
    }
        
    strokeRoundRect(cxt, x, y, width, height, radius, /*optional*/ lineWidth, /*optional*/ strokeColor) {
        //圆的直径必然要小于矩形的宽高          
        if (2 * radius > width || 2 * radius > height) { return false; }
 
        cxt.save();
        cxt.translate(x, y);
        //绘制圆角矩形的各个边  
        this.drawRoundRectPath(cxt, width, height, radius);
        cxt.lineWidth = lineWidth || 2; //若是给定了值就用给定的值否则给予默认值2  
        cxt.strokeStyle = strokeColor || "#000";
        cxt.stroke();
        cxt.restore();
    }
 
    drawRoundRectPath(cxt, width, height, radius) {
        cxt.beginPath(0);
        //从右下角顺时针绘制，弧度从0到1/2PI  
        cxt.arc(width - radius, height - radius, radius, 0, Math.PI / 2);
 
        //矩形下边线  
        cxt.lineTo(radius, height);
 
        //左下角圆弧，弧度从1/2PI到PI  
        cxt.arc(radius, height - radius, radius, Math.PI / 2, Math.PI);
 
        //矩形左边线  
        cxt.lineTo(0, radius);
 
        //左上角圆弧，弧度从PI到3/2PI  
        cxt.arc(radius, radius, radius, Math.PI, Math.PI * 3 / 2);
 
        //上边线  
        cxt.lineTo(width - radius, 0);
 
        //右上角圆弧  
        cxt.arc(width - radius, radius, radius, Math.PI * 3 / 2, Math.PI * 2);
 
        //右边线  
        cxt.lineTo(width, height - radius);
        cxt.closePath();
    }

    // 绘制装饰元素
    renderDecorations() {
        var zsp = [
            {x:50, y:550, width:80, height:80,color:'#00ff88',bgcolor:'#008844'},
            {x:1030, y:450, width:80, height:80,color:'#00ff88',bgcolor:'#008844'}
        ];
        // 绘制左侧装饰面板
        zsp.forEach(z=>{
            this.ctx.fillStyle = z.bgcolor;
            this.ctx.fillRect(z.x, z.y, z.width, z.height);
            this.ctx.strokeStyle = z.color;
            this.ctx.lineWidth = 5;
            this.ctx.strokeRect(z.x, z.y, z.width, z.height);
            
            // 装饰面板上的圆形按钮
            for (let i = 0; i < 6; i++) {
                const row = Math.floor(i / 3);
                const col = i % 3;
                this.ctx.fillStyle = '#cc6600';
                this.ctx.beginPath();
                this.ctx.arc(z.x + 20 + col * 20, z.y + 20 + row * 30, 8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#ffaa00';
                this.ctx.stroke();
            }
        });
    }
    
    // 绘制收集物（紫色星星）
    renderCollectible() {
        this.ctx.save();
        this.ctx.translate(this.collectible.x + this.collectible.size/2, this.collectible.y + this.collectible.size/2);
        
        // 绘制星星
        this.ctx.fillStyle = this.collectible.color;
        this.ctx.beginPath();
        
        // 星星的10个顶点
        for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI * 2 / 10) - (Math.PI / 2);
            const radius = i % 2 === 0 ? this.collectible.size/2 : this.collectible.size/4;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // 星星发光效果
        this.ctx.shadowColor = '#ff00ff';
        this.ctx.shadowBlur = 15;
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    // 绘制玩家（机器人）
    renderPlayer() {
        // 玩家主体
        //头
        this.fillRoundRect(this.ctx, this.player.x+25, this.player.y, 30, 10, 5, this.player.border);
        //身体
        this.fillRoundRect(this.ctx, this.player.x+10, this.player.y+7, this.player.width-20, this.player.height-30, 5, this.player.color);
                        
        // 眼睛
        this.ctx.fillStyle = '#f00';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + 25, this.player.y + 22, 10, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + 55, this.player.y + 22, 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + 25, this.player.y + 22, 8, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + 55, this.player.y + 22, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + 22, this.player.y + 20, 2, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + 52, this.player.y + 20, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 嘴巴
        this.fillRoundRect(this.ctx, this.player.x+22, this.player.y+40, 36, 8, 3, '#f00');
        this.fillRoundRect(this.ctx, this.player.x+24, this.player.y+42, 32, 4, 2, '#333');
        
        //手
        this.fillRoundRect(this.ctx, this.player.x, this.player.y+22, 7, 20, 3, this.player.color);
        this.fillRoundRect(this.ctx, this.player.x + this.player.width-7, this.player.y+22, 7, 20, 3, this.player.color);
        this.fillRoundRect(this.ctx, this.player.x+7, this.player.y+27, 3, 10, 1, '#c00');
        this.fillRoundRect(this.ctx, this.player.x + this.player.width-10, this.player.y+27, 3, 10, 1, '#c00');
        
        //腰
        this.fillRoundRect(this.ctx, this.player.x+2, this.player.y+55, this.player.width-4, 10, 4, '#f00');
        
        // 腿部
        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + 18, this.player.y + 70, 5, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + 40, this.player.y + 70, 5, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + 63, this.player.y + 70, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#c00';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + 18, this.player.y + 70, 3, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + 40, this.player.y + 70, 3, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + 63, this.player.y + 70, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    // 重启游戏
    restartGame() {
        location.reload();
    }
    
    // 返回主界面
    gotoMain() {
        location.href = 'index.html';
    }
    
    // 游戏主循环
    gameLoop() {
        if(this.player.x >= 0) this.update();
        if(this.player.x >= 0) this.updateMsg();
        this.render();
        this.config.aniID = requestAnimationFrame(() => this.gameLoop()); //默认60FPS即每帧约 16.7ms
    }
}