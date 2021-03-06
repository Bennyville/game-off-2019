import "phaser"
import {Player} from "../objects/player";
import {Platform} from "../objects/platform";
import {Enemy} from "../objects/enemy";
import {Bullet} from "../objects/bullet";

export class GameScene extends Phaser.Scene {
    private player!: Player;
    private enemies!: Phaser.GameObjects.Group;
    private bullets!: Phaser.GameObjects.Group;
    private currentLevel: number;
    private showUpgradeMenu!: boolean;
    private upgradeMenu!: Phaser.GameObjects.Group;
    private playerState?: object;
    private upgradeMenuBg!: Phaser.GameObjects.Graphics;
    private map!: Phaser.Tilemaps.Tilemap;
    private environmentLayer!: Phaser.Tilemaps.StaticTilemapLayer; 
    private platformLayer!: Phaser.Tilemaps.StaticTilemapLayer; 

    constructor() {
        super({
            key: "GameScene"
        });

        this.currentLevel = 1;
    }

    init(data): void {
        this.anims.create({
            key: 'playerWalking',
            frames: this.anims.generateFrameNumbers('player', { start: 6, end: 9 }),
            frameRate: 16,
            repeat: -1
        });

        this.anims.create({
            key: 'enemyWalking',
            frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }),
            frameRate: 16,
            repeat: -1
        });

        if(data.hasOwnProperty('playerState') && this.currentLevel > 1) {
            this.playerState = data.playerState;
        }
    }

    create(): void {
        this.showUpgradeMenu = true;

        this.add.tileSprite(400, 300, 800, 608, "background");

        this.map = this.add.tilemap('map');

        let tileset = this.map.addTilesetImage('environment', 'tiles');
        this.environmentLayer = this.map.createStaticLayer('Environment', tileset, 0, 0); 
        this.platformLayer = this.map.createStaticLayer('Platforms', tileset, 0, 0); 
        this.platformLayer.setCollisionByExclusion([-1], true);

        // @ts-ignore
        this.platformLayer.layer.data.forEach((row) => { // here we are iterating through each tile.
            // @ts-ignore
            row.forEach((Tile) => {
                Tile.collideDown = false;
            })
        });
        
        this.add.text(
            30,
            30,
            "Level " + this.currentLevel
        );

        this.player = new Player(this, 0, 0, 'player');

        if(this.playerState) {
            this.player.applyState(this.playerState);
        }

        this.enemies = this.add.group();

        for(let i = 0; i < this.currentLevel*2; i++) {
            this.enemies.add(new Enemy(this, 0, 0, 'enemy'));
        }

        this.bullets = this.add.group();

        this.physics.add.collider(this.player, this.platformLayer);
        this.physics.add.collider(this.enemies, this.platformLayer);
        this.physics.add.overlap(this.player, this.enemies);
        this.physics.add.overlap(this.bullets, this.enemies);
        this.physics.add.overlap(this.enemies, this.player.bullets);
        this.physics.add.overlap(this.bullets, this.player);

        this.upgradeMenuBg = this.add.graphics();
        this.upgradeMenuBg.fillStyle(0x000000, .8);
        this.upgradeMenuBg.fillRect(0, 0, this.sys.canvas.width, this.sys.canvas.height);

        let upgrades = [
          'firerate',
          'healing',
          'moreHp',
          'damage'
        ];

        let shuffledUpgrades = Phaser.Math.RND.shuffle(upgrades);

        let firstUpgrade = shuffledUpgrades[0];
        let secondUpgrade = shuffledUpgrades[1];

        let firstUpgradeButton = this.add.text(
            0,
            0,
            '> ' + this.getUpgradeText(firstUpgrade)
        );

        firstUpgradeButton
            .setInteractive()
            .setX(this.sys.canvas.width / 2 - firstUpgradeButton.width / 2)
            .setY(this.sys.canvas.height / 2)
            .on('pointerdown', () => {
                this.player.applyUpgrade(firstUpgrade);
                this.showUpgradeMenu = false;
            })
            .on('pointerover', function() {
                // @ts-ignore
                this.setStyle({fill:'#000000'});
            })
            .on('pointerout', function() {
                // @ts-ignore
                this.setStyle({fill:'#ffffff'});
            })

        let secondUpgradeButton = this.add.text(
            0,
            0,
            '> ' + this.getUpgradeText(secondUpgrade)
        );

        secondUpgradeButton
            .setInteractive()
            .setX(this.sys.canvas.width / 2 - secondUpgradeButton.width / 2)
            .setY(this.sys.canvas.height / 2 + firstUpgradeButton.height + 10)
            .on('pointerdown', () => {
                this.player.applyUpgrade(secondUpgrade);
                this.showUpgradeMenu = false;
            })
            .on('pointerover', function() {
                // @ts-ignore
                this.setStyle({fill:'#000000'});
            })
            .on('pointerout', function() {
                // @ts-ignore
                this.setStyle({fill:'#ffffff'});
            });

        let headline = this.add.text(
            0,
            0,
            "Choose an upgrade"
        )
            .setFontSize(24);

        headline
            .setX(this.sys.canvas.width / 2 - headline.width / 2)
            .setY(this.sys.canvas.height / 2 - firstUpgradeButton.height - 20);

        this.upgradeMenu = this.add.group();
        this.upgradeMenu.add(this.upgradeMenuBg);
        this.upgradeMenu.add(firstUpgradeButton);
        this.upgradeMenu.add(secondUpgradeButton);
        this.upgradeMenu.add(headline);
        this.upgradeMenu.setDepth(2, 1);
    }

    update(): void {
        if(!this.showUpgradeMenu) {
            this.upgradeMenu.destroy(true);

            if (this.enemies.getLength() == 0) {
                let playerState = this.player.getState();
                this.currentLevel++;
                this.scene.restart({playerState: playerState});
            }

            if (!this.player.pushing) {
                this.player.update();
            }

            this.player.findTarget(this.enemies);

            this.player.shoot();


            this.physics.world.on('worldbounds', (object) => {
                if (object.gameObject instanceof Bullet) {
                    object.gameObject.destroy();
                }

                if (object.gameObject instanceof Enemy) {
                    let enemy: Enemy = object.gameObject;
                    
                    if (object.blocked.right) {
                        enemy.xDirection = 1;
                    } else if (object.blocked.left) {
                        enemy.xDirection = 0;
                    }
                }
            });

            // @ts-ignore
            Phaser.Actions.Call(this.player.bullets.getChildren(), (bullet: Bullet) => {
                bullet.move();
            }, null);

            // @ts-ignore
            Phaser.Actions.Call(this.bullets.getChildren(), (bullet: Bullet) => {
                bullet.move();
            }, null);


            // @ts-ignore
            this.physics.overlap(this.bullets, this.player, (bullet: Bullet, player: Player) => {
                bullet.destroy();
                player.damage(5);
            });

            // @ts-ignore
            Phaser.Actions.Call(this.enemies.getChildren(), (enemy: Enemy) => {
                enemy.update();
                enemy.move(this.player.x, this.player.y);

                enemy.shoot(this.bullets);

                enemy.updateHpBar();

                // @ts-ignore
                Phaser.Actions.Call(enemy.bullets.getChildren(), (bullet: Bullet) => {
                    bullet.move();
                }, null);

                if (enemy.dead) {
                    enemy.kill();
                }
            }, null);

            this.player.pushing = false;

            // @ts-ignore
            this.physics.overlap(this.player, this.enemies, (player: Player, enemy: Enemy) => {
                if (player.x < enemy.x) {
                    player.push(-3000);
                } else {
                    player.push(3000);
                }

                player.damage(4 + this.currentLevel);
            });

            this.player.updateWeapon();

            // @ts-ignore
            this.physics.overlap(this.enemies, this.player.bullets, (enemy: Enemy, bullet: Bullet) => {
                bullet.destroy();
                enemy.damage(this.player.bulletDamage);
                if(bullet.vx < 0) {
                    enemy.setX(enemy.x - 5);
                } else {
                    enemy.setX(enemy.x + 5);
                } 
            });

            // @ts-ignore
            // this.physics.collide(this.enemies, this.platforms, (enemy: Enemy, platform: Platform) => {
            //     if(enemy.patrolling && (enemy.body.velocity.x > 0 && enemy.x + 20 >= platform.x + platform.width) || (enemy.body.velocity.x < 0 && enemy.x <= platform.x)) {
            //         enemy.body.velocity.x *= -1;
            //     }
            // });

            if (this.player.dead) {
                let bestLevel: string | null = localStorage.getItem('bestLevel');
                if(bestLevel == null || +bestLevel < this.currentLevel) {
                   localStorage.setItem('bestLevel', this.currentLevel.toString());
                }
                this.currentLevel = 1;
                this.playerState = undefined;
                this.scene.stop("GameScene");
                this.scene.start("MainMenuScene");
            }

            this.player.updateHpBar();
        }
    }

    getUpgradeText(upgrade) {
        switch(upgrade) {
            case 'firerate':
                return 'Firerate +1';
            case 'healing':
                return 'Heal +50';
            case 'moreHp':
                return 'Healthpoints +25';
            case 'damage':
                return 'Damage +2';
            default:
                return 'Unknown upgrade';
        }
    }
}
