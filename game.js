const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);
let player;
let cursors;
let obstacles;
let ground;
let isGameOver = false;
let popupVisible = false;
let spawnInterval = 2000; // Tempo inicial de spawn das gaivotas (em ms)
let obstacleSpeed = -200; // Velocidade inicial das gaivotas
let gameSpeed = 3; // Velocidade inicial do chão

let timerText;
let elapsedTime = 0; // Tempo decorrido em segundos

function preload() {
    this.load.image('cidade', 'assets/background-static.png');
    this.load.image('relva', 'assets/background-relva.png');
    this.load.image('obstacle', 'assets/obstacle.png');
    this.load.spritesheet('tobias', 'assets/tobias-sprite.png', { frameWidth: 64, frameHeight: 64 });
}

function create() {
    // Criar HUD do tempo no canto superior direito
    timerText = this.add.text(1180, 20, 'Tempo: 0s', {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    }).setOrigin(1, 0);

    this.add.image(600, 300, 'cidade').setScale(2).setDepth(-1);

    this.relva = this.add.tileSprite(600, 580, 1200, 100, 'relva')
        .setOrigin(0.5, 1)
        .setDepth(1)
        .setScale(1, 1);

    player = this.physics.add.sprite(200, 450, 'tobias').setScale(2).setDepth(2);
    this.physics.add.collider(player, obstacles, hitObstacle, null, this);

    ground = this.physics.add.staticGroup();
    let groundPlatform = ground.create(600, 530, null).setSize(1200, 20).setVisible(false);
    this.physics.add.collider(player, ground);

    player.setCollideWorldBounds(true);
    player.setSize(40, 50).setOffset(12, 10);

    this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNumbers('tobias', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    player.play('run');

    obstacles = this.physics.add.group();
    this.physics.add.collider(player, obstacles, hitObstacle, null, this);

    this.gameOverText = this.add.text(600, 250, 'Miau! Vamos de novo!', {
        fontSize: '32px',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
        align: 'center'
    }).setOrigin(0.5).setDepth(3).setVisible(false);

    this.gameOverButton = this.add.text(600, 300, 'OK', {
        fontSize: '28px',
        fill: '#ffffff',
        backgroundColor: '#ff0000',
        padding: { x: 15, y: 8 },
        align: 'center',
        cursor: 'pointer'
    }).setOrigin(0.5).setDepth(3).setInteractive().setVisible(false);

    this.gameOverButton.on('pointerdown', () => {
        elapsedTime = 0; // Reinicia o tempo ao recomeçar
        spawnInterval = 2000; // 🔹 Reset do intervalo das gaivotas para início normal

        isGameOver = false;
        popupVisible = false;
        obstacleSpeed = -200; // 🔹 Reset da velocidade ao reiniciar o jogo
        gameSpeed = 3; // 🔹 Reset da velocidade do chão também

        this.gameOverText.setVisible(false);
        this.gameOverButton.setVisible(false);

        this.physics.resume();
        this.time.paused = false;
        this.scene.restart();
    });

    this.spawnEvent = this.time.addEvent({
        delay: spawnInterval,
        callback: spawnObstacle,
        callbackScope: this,
        loop: true
    });

    cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointerdown', jump, this);
}

function update() {
    if (!isGameOver) {
        this.relva.tilePositionX += gameSpeed; // 🔹 O chão acelera progressivamente!
        elapsedTime += 1 / 60; // Atualiza o tempo (60 frames por segundo)
        timerText.setText(`Tempo: ${elapsedTime.toFixed(1)}s`); // Atualiza o texto com 1 casa decimal
    }

    if ((cursors.space.isDown || cursors.up.isDown) && !isGameOver) {
        jump();
    }
}

function jump() {
    if (player.body.touching.down) {
        player.setVelocityY(-350);
    }
}

function spawnObstacle() {
    let obstacle = obstacles.create(1200, 470, 'obstacle')
        .setDepth(2)
        .setVelocityX(obstacleSpeed);

    obstacle.body.allowGravity = false;
    obstacle.setImmovable(true);

    obstacle.setSize(5, 5).setOffset(1, 1);

    console.log("Gaivota criada na posição:", obstacle.x, obstacle.y);

    this.physics.add.collider(obstacle, ground);

    obstacle.setCollideWorldBounds(false);
    obstacle.body.onWorldBounds = true;
    obstacle.body.world.on('worldbounds', function (body) {
        if (body.gameObject === obstacle) {
            obstacle.destroy();
        }
    }, this);

    // 🔹 Aceleração Progressiva
    if (obstacleSpeed > -2000) {
        obstacleSpeed -= 20; // Gaivotas ficam mais rápidas
    }

    if (gameSpeed < 10) {
        gameSpeed += 0.2; // 🔹 O chão também acelera progressivamente!
    }

    // 🔹 Diminui progressivamente o tempo de spawn até um limite mínimo (400ms)
    if (spawnInterval > 400) {
        spawnInterval -= 50;
        this.spawnEvent.remove();
        this.spawnEvent = this.time.addEvent({
            delay: spawnInterval,
            callback: spawnObstacle,
            callbackScope: this,
            loop: true
        });
    }
}

function hitObstacle(player, obstacle) {
    if (isGameOver) return;

    console.log("O Tobias bateu numa gaivota! Fim de jogo.");
    console.log(`Tempo final: ${elapsedTime.toFixed(1)} segundos`);

    isGameOver = true;

    this.physics.pause();
    this.time.paused = true;
    this.relva.tilePositionX = this.relva.tilePositionX;
    player.anims.pause();
    player.setVelocityX(0);
    obstacles.setVelocityX(0);

    this.gameOverText.setVisible(true);
    this.gameOverButton.setVisible(true);
}
