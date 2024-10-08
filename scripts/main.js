import { initAudio, playBubbleSound, playPopSound,stopTextSound, playTextSound,playBounceSound,playSnapSound, toggleSound, updateSpeakerIcon } from './audio.js';


initAudio();

const { Engine, Render, World, Bodies, Body, Events, Vector } = Matter;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const messageElement = document.getElementById('message');
const centralMessageElement = document.getElementById('centralMessage');
const debugElement = document.getElementById('debug');
const videoElement = document.getElementById('webcamVideo');

let gameWidth, gameHeight, paddleWidth, paddleHeight, ballSize;
let engine, render, leftPaddle, rightPaddle, ball, topWall, bottomWall, leftWall, rightWall;

let leftScore = 0;
let rightScore = 0;
let gameState = 'waiting'; // 'waiting', 'ready', 'playing'
let currentTurn = 'left';
let lastWinner = 'left';

let initialBallSpeed = window.innerWidth*0.01;
let currentBallSpeed = initialBallSpeed;
let acceleration = 1.3; // Acceleration factor when ball hits top/bottom walls
let paddleSensitivity = 2; 

//activate debug mode by adding ?debug=true to the url

function isDebugMode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') === 'true';
}

let isDebug=isDebugMode();


function resizeCanvas() {

    //update dimensions
    const aspectRatio = 16 / 9;
    const windowRatio = window.innerWidth / window.innerHeight;

    if (windowRatio > aspectRatio) {
        gameHeight = window.innerHeight;
        gameWidth = gameHeight * aspectRatio;
    } else {
        gameWidth = window.innerWidth;
        gameHeight = gameWidth / aspectRatio;
    }

    paddleWidth = gameWidth * 0.03;
    paddleHeight = gameHeight * 0.25;
    ballSize = gameHeight / 15;
    initialBallSpeed = gameWidth * 0.01;
    currentBallSpeed = initialBallSpeed;

    //update canvas
    canvas.width = gameWidth;
    canvas.height = gameHeight;
    if (render) {
        render.canvas.width = gameWidth;
        render.canvas.height = gameHeight;
        updateGameObjects();
    }
}


function updateGameObjects() {

    // Matter.Bodies.rectangle(x, y, width, height, [options]) 
    if (leftPaddle) Body.setPosition(leftPaddle, { x: (paddleWidth / 2)+paddleWidth, y: gameHeight / 2 });
    if (rightPaddle) Body.setPosition(rightPaddle, { x: (gameWidth - paddleWidth / 2)-paddleWidth, y: gameHeight / 2 });
    if (ball) Body.setPosition(ball, { x: gameWidth / 2, y: gameHeight / 2 });
    if (topWall) Body.setPosition(topWall, { x: gameWidth / 2, y: -15 });//25
    if (bottomWall) Body.setPosition(bottomWall, { x: gameWidth / 2, y: gameHeight +15 });//-25
    if (leftWall) Body.setPosition(leftWall, { x: -25, y: gameHeight / 2 });
    if (rightWall) Body.setPosition(rightWall, { x: gameWidth + 25, y: gameHeight / 2 });

    //Matter.Body.setVertices(body, vertices)
    Body.setVertices(leftPaddle, Bodies.rectangle((paddleWidth / 2)+paddleWidth, gameHeight / 2, paddleWidth, paddleHeight).vertices);
    Body.setVertices(rightPaddle, Bodies.rectangle((gameWidth - paddleWidth / 2)-paddleWidth, gameHeight / 2, paddleWidth, paddleHeight).vertices);
    Body.scale(ball, ballSize / (ball.circleRadius * 2), ballSize / (ball.circleRadius * 2));
    Body.setVertices(topWall, Bodies.rectangle(gameWidth / 2, -15, gameWidth, 50).vertices);
    Body.setVertices(bottomWall, Bodies.rectangle(gameWidth / 2, gameHeight + 15, gameWidth, 50).vertices);
    Body.setVertices(leftWall, Bodies.rectangle(-25, gameHeight / 2, 50, gameHeight).vertices);
    Body.setVertices(rightWall, Bodies.rectangle(gameWidth + 25, gameHeight / 2, 50, gameHeight).vertices);
}

window.addEventListener('resize', () => {
    resizeCanvas();
});

resizeCanvas();

function createWorld() {
    engine = Engine.create({
        gravity: { x: 0, y: 0 }
    });
    
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: gameWidth,
            height: gameHeight,
            wireframes: false,
            background: 'transparent'
        }
    });

    leftPaddle = Bodies.rectangle((paddleWidth / 2)+paddleWidth, gameHeight / 2, paddleWidth, paddleHeight, { isStatic: true, render: { fillStyle: 'red' } });
    rightPaddle = Bodies.rectangle((gameWidth - paddleWidth / 2)-paddleWidth, gameHeight / 2, paddleWidth, paddleHeight, { isStatic: true, render: { fillStyle: 'blue' } });
    ball = Bodies.circle(gameWidth / 2, gameHeight / 2, ballSize / 2, {
        restitution: 1,
        friction: 0,
        frictionAir: 0,
        inertia: Infinity,
        render: { fillStyle: 'yellow' }
    });

    topWall = Bodies.rectangle(gameWidth / 2, -15, gameWidth, 50, { isStatic: true, 
        render: { 
            fillStyle: 'rgba(0, 0, 0, 0.2)',
            strokeStyle: 'rgba(0, 0, 0, 0.5)',
            lineWidth: 1
        }  });
    bottomWall = Bodies.rectangle(gameWidth / 2, gameHeight+15, gameWidth, 50, { isStatic: true, 
        render: { 
            fillStyle: 'rgba(0, 0, 0, 0.2)',
            strokeStyle: 'rgba(0, 0, 0, 0.5)',
            lineWidth: 1
        }   });
    leftWall = Bodies.rectangle(-25, gameHeight / 2, 50, gameHeight, { isStatic: true, render: { fillStyle: '#808080' } });
    rightWall = Bodies.rectangle(gameWidth + 25, gameHeight / 2, 50, gameHeight, { isStatic: true, render: { fillStyle: '#808080' } });

    World.add(engine.world, [leftPaddle, rightPaddle, ball, topWall, bottomWall, leftWall, rightWall]);

    Matter.Runner.run(engine);
    Render.run(render);

    Events.on(engine, 'afterUpdate', () => {
    if(gameState === 'playing')
        // Keep the ball within bounds
        if (ball.position.x < 0 || ball.position.x > gameWidth || 
            ball.position.y < 0 || ball.position.y > gameHeight) {
                console.log("out of bound");
            resetBall(ball.position.x < gameWidth / 2 ? 'right' : 'left', true);
        }
    });

    //when a collision happens
    Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        if(gameState==="playing"){
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                
                if (pair.bodyA === ball || pair.bodyB === ball) {
                    if (pair.bodyA === leftWall || pair.bodyB === leftWall) {
                        rightScore++;
                        console.log("right winner");
                        playBubbleSound();
                        resetBall('right', true);
                    } else if (pair.bodyA === rightWall || pair.bodyB === rightWall) {
                        leftScore++;
                        console.log("left winner");
                        playBubbleSound();
                        resetBall('left',true);
                    } else if (pair.bodyA === leftPaddle || pair.bodyB === leftPaddle || pair.bodyA === rightPaddle || pair.bodyB === rightPaddle) {
                        playPopSound();
                        const velocity = Vector.normalise(ball.velocity);
                        Body.setVelocity(ball, Vector.mult(velocity, currentBallSpeed));
                    } else if (pair.bodyA === topWall || pair.bodyB === topWall || pair.bodyA === bottomWall || pair.bodyB === bottomWall) {
                        playBounceSound();
                        currentBallSpeed/acceleration <15 ? currentBallSpeed *= acceleration : currentBallSpeed;
                        let velocity = Vector.normalise(ball.velocity);
                        
                        // Reflect the ball's velocity and add a slight randomization
                        velocity.y = -velocity.y;
                        const randomAngle = (Math.random() - 0.5) * Math.PI / 8; // Random angle between -π/16 and π/16
                        velocity = Vector.rotate(velocity, randomAngle);
                        
                        Body.setVelocity(ball, Vector.mult(velocity, currentBallSpeed));
                    }
                }
            }
        }
    });
}

let countdownStartTime = 0;
const countdownDuration = 4000; // 4 seconds in milliseconds

function resetBall(winner, started) {

    currentTurn = winner === 'left' ? 'right' : 'left';

    lastWinner = winner;
    
    Body.setVelocity(ball, { x: 0, y: 0 });
    
    currentBallSpeed = initialBallSpeed;
    
    scoreElement.textContent = `${leftScore} - ${rightScore}`;

    if(started)
    {

        if (leftScore >= 5 || rightScore >= 5) {
            GameOver();
        }else
        {   
            gameState = 'ready';
        }
    }else
    {
        console.log("not started");
    }
}

function GameOver()
{
 
    gameState = 'waiting';
    console.log("GAME OVER");
    centralMessageElement.innerHTML = `${leftScore > rightScore ? 'Red' : 'Blue'} player wins! `;
    messageElement.innerHTML = `✌✌  to start`;

}

function updateGame() {

    if (gameState === 'countdown') {

        const elapsedTime = Date.now() - countdownStartTime;
        const remainingTime = countdownDuration - elapsedTime;
        
        if (remainingTime > 0) {
            const remainingSeconds = Math.ceil(remainingTime / 1000);
            centralMessageElement.innerHTML = remainingSeconds > 3 ? "Ready" : remainingSeconds.toString();
            
        } else {
            gameState = 'ready';
            centralMessageElement.innerHTML="";
        }
        messageElement.innerHTML = `👐 Keep your hands open facing the camera. <br>Move your hands up and down to move the paddle up and down,<br>rotate your hands to rotate the paddle.<br> Make a fist to release the ball.`;
    }

    if (gameState === 'ready') {
        const paddle = currentTurn === 'left' ? leftPaddle : rightPaddle;
        const ballOffset = (currentTurn === 'left' ? 1 : -1) * (paddleWidth / 2 + ballSize / 2);
        Body.setPosition(ball, { 
            x: paddle.position.x + ballOffset, 
            y: paddle.position.y 
        });
        Body.setAngle(ball, paddle.angle);
    }

    if(isDebug)
    {debugElement.textContent = `Game State: ${gameState}, Turn: ${currentTurn}, Ball Position: (${Math.round(ball.position.x)}, ${Math.round(ball.position.y)}), Ball Velocity: (${Math.round(ball.velocity.x)}, ${Math.round(ball.velocity.y)}), Ball Speed: ${Math.round(currentBallSpeed)}`;}
    
    requestAnimationFrame(updateGame);
}

function throwBall() {
    console.log("ball thrown");
    playSnapSound();
    gameState = 'playing';
    
    const direction = currentTurn === 'left' ? 1 : -1;
    const paddle = currentTurn === 'left' ? leftPaddle : rightPaddle;
    const angle = paddle.angle;

    const initialVelocity = Vector.rotate({ x: direction * currentBallSpeed, y: 0 }, angle);
    
    Body.setVelocity(ball, initialVelocity);

    const ballOffset = (currentTurn === 'left' ? 1 : -1) * ((paddleWidth / 2)+paddleWidth + ballSize / 2 + 5);
    Body.setPosition(ball, { x: paddle.position.x + ballOffset, y: paddle.position.y });

    messageElement.innerHTML = 'Game in progress';
    centralMessageElement.innerHTML="";
}

function isVictorySign(landmarks) {
    const indexFingerTip = landmarks[8];
    const middleFingerTip = landmarks[12];
    const ringFingerTip = landmarks[16];
    
    return (indexFingerTip.y < landmarks[7].y && 
            middleFingerTip.y < landmarks[11].y && 
            ringFingerTip.y > landmarks[15].y && 
            landmarks[20].y > landmarks[19].y);
}

function isThumbsUp(landmarks) {
    return landmarks[4].y < landmarks[3].y && landmarks[3].y < landmarks[2].y;
}

function isOpenPalm(landmarks) {
    return landmarks[8].y < landmarks[7].y && landmarks[12].y < landmarks[11].y && landmarks[16].y < landmarks[15].y && landmarks[20].y < landmarks[19].y;
}

function isFist(landmarks) {
    return landmarks[8].y > landmarks[7].y && landmarks[12].y > landmarks[11].y && landmarks[16].y > landmarks[15].y && landmarks[20].y > landmarks[19].y;
}

// Set up MediaPipe Hands
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

let leftVictorySign = false;
let rightVictorySign = false;
let lastLeftPaddleY = gameHeight / 2;
let lastRightPaddleY = gameHeight / 2;
let victorySignStartTime = 0;
const victorySignDuration = 1000; // 3 seconds in milliseconds


hands.onResults(results => {
    if (results.multiHandLandmarks) {
        leftVictorySign = false;
        rightVictorySign = false;

        results.multiHandLandmarks.forEach((landmarks, index) => {
            const hand = results.multiHandedness[index];
            const wrist = landmarks[0];
            const middleFingerTip = landmarks[12];

            const paddleY = ((wrist.y + middleFingerTip.y) / 2) * gameHeight;

            const dx = middleFingerTip.x - wrist.x;
            const dy = middleFingerTip.y - wrist.y;
            const angle = Math.atan2(dy, dx) - Math.PI / 2;

            if (hand.label === 'Right') {

                Body.setPosition(leftPaddle, { x: (paddleWidth / 2)+paddleWidth, y: paddleY });
                Body.setAngle(leftPaddle, -angle);
                lastLeftPaddleY = paddleY;
                
                if (isVictorySign(landmarks)) {
                    leftVictorySign = true;
                }

                if (gameState === 'ready' && currentTurn === 'left') {

                    if (isVictorySign(landmarks)) {
                        throwBall();
                    }
                    else
                    {
                        messageElement.innerHTML = "Red's turn. Close your hand to throw the ball";
                    }
                }
            } else if (hand.label === 'Left') {
                Body.setPosition(rightPaddle, { x: (gameWidth - paddleWidth / 2)-paddleWidth, y: paddleY });
                Body.setAngle(rightPaddle, Math.PI - angle);
                lastRightPaddleY = paddleY;
                
                if (isVictorySign(landmarks)) {
                    rightVictorySign = true;
                }

                if (gameState === 'ready' && currentTurn === 'right') {
                    
                    if (isVictorySign(landmarks)) {
                        throwBall();
                    }
                    else
                    {
                        messageElement.innerHTML = "Blue's turn. Close your hand to throw the ball";
                    }
                }
            }
        });

        if (gameState === 'waiting') {
            if (leftVictorySign && rightVictorySign) {
                if (victorySignStartTime === 0) {
                    victorySignStartTime = Date.now();
                }
                const elapsedTime = Date.now() - victorySignStartTime;
                const progress = Math.min(elapsedTime / victorySignDuration, 1);
                updateProgressIndicator(progress);
                playTextSound();
                
                if (progress === 1) {

                    playSnapSound();
                    leftScore = 0;
                    rightScore = 0;
                    console.log("exitting wait");
                    resetBall(lastWinner, false);
                    hideProgressIndicator();
                    countdownStartTime = Date.now();
                    console.log('Countdown started at:', countdownStartTime); 
                    gameState = 'countdown';
                }
            } else {
                stopTextSound();
                victorySignStartTime = 0;
                updateProgressIndicator(0);
                hideProgressIndicator();
            }
        }
    } else {
        stopTextSound();
        victorySignStartTime = 0;
        updateProgressIndicator(0);
        hideProgressIndicator();
    }

    if (results.multiHandLandmarks.length === 0) {
        Body.setPosition(leftPaddle, { x: (paddleWidth / 2)+paddleWidth, y: lastLeftPaddleY });
        Body.setPosition(rightPaddle, { x: (gameWidth - paddleWidth / 2)-paddleWidth, y: lastRightPaddleY });
        Body.setAngle(leftPaddle, 0);
        Body.setAngle(rightPaddle, 0);
    }
});


const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 1280,
    height: 720
});

function updateProgressIndicator(progress) {
    const progressPath = document.getElementById('progressPath');
    const dashArray = `${progress * 100}, 100`;
    progressPath.style.strokeDasharray = dashArray;
    
    const progressIndicator = document.getElementById('progressIndicator');
    progressIndicator.style.display = 'block';
}

function hideProgressIndicator() {
    const progressIndicator = document.getElementById('progressIndicator');
    progressIndicator.style.display = 'none';
}

camera.start().then(() => {
    messageElement.innerHTML = "make ✌✌ with both hands to start";
    centralMessageElement.innerHTML = "";
    createWorld();
    updateGame();
});

export {toggleSound, updateSpeakerIcon};