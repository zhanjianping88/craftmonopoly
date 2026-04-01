import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// 1. 初始化基础场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // 天空蓝色

// 2. 初始化相机（斜视角俯视，类似桌面游戏）
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// 设置相机位置：居中稍后上方
camera.position.set(0, 30, 40);
// 看向中心点
camera.lookAt(0, 0, 0);

// 3. 初始化渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // 开启阴影效果
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- 像素风贴图生成器 ---
function createPixelTexture(type) {
    const canvas = document.createElement('canvas');
    const size = 16; // 16x16 的低分辨率贴图
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // 基础颜色填充
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let color = '';
            const noise = Math.random() * 20 - 10; // 颜色噪声，制造像素颗粒感
            
            if (type === 'grass_top') { // 平原草地顶面
                const r = 80 + noise, g = 180 + noise, b = 80 + noise;
                color = `rgb(${r},${g},${b})`;
            } else if (type === 'sand') { // 沙漠
                const r = 210 + noise, g = 180 + noise, b = 140 + noise;
                color = `rgb(${r},${g},${b})`;
            } else if (type === 'jungle_grass') { // 丛林草地 (更深更绿)
                const r = 50 + noise, g = 150 + noise, b = 50 + noise;
                color = `rgb(${r},${g},${b})`;
            } else if (type === 'taiga_grass') { // 针叶林草地 (偏蓝绿)
                const r = 60 + noise, g = 130 + noise, b = 110 + noise;
                color = `rgb(${r},${g},${b})`;
            } else if (type === 'snow') { // 雪原
                const v = 240 + noise;
                color = `rgb(${v},${v},${v})`;
            } else if (type === 'dirt') { // 泥土
                const r = 120 + noise, g = 80 + noise, b = 40 + noise;
                color = `rgb(${r},${g},${b})`;
            } else if (type === 'stone') { // 石头/白格
                const v = 150 + noise;
                color = `rgb(${v},${v},${v})`;

            } else if (type === 'gold') { // 金块/特殊格
                const r = 250 + noise, g = 200 + noise, b = 40 + noise;
                color = `rgb(${r},${g},${b})`;
            } else if (type === 'chance_red') { // 机会：红色格子
                const r = 220 + noise, g = 50 + noise, b = 50 + noise;
                color = `rgb(${r},${g},${b})`;
            } else if (type === 'chest_orange') { // 命运：橙色格子
                const r = 250 + noise, g = 140 + noise, b = 30 + noise;
                color = `rgb(${r},${g},${b})`;
            } else if (type === 'wood') { // 木板/桌面
                const r = 140 + noise, g = 100 + noise, b = 60 + noise;
                color = `rgb(${r},${g},${b})`;
            } else if (type === 'jail_gray') { // 监狱：深灰色铁栅栏风格
                const v = 80 + noise;
                color = `rgb(${v},${v},${v})`;
                // 画简单的栏杆纹理
                if (i % 4 === 0 || j % 4 === 0) color = `rgb(40,40,40)`;
            }
            
            ctx.fillStyle = color;
            ctx.fillRect(i, j, 1, 1);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    // 关键：设置过滤模式为 NearestFilter，保持放大后的像素锯齿感
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

// 预生成所有材质
const matPlains = new THREE.MeshStandardMaterial({ map: createPixelTexture('grass_top'), roughness: 1.0 });
const matDesert = new THREE.MeshStandardMaterial({ map: createPixelTexture('sand'), roughness: 1.0 });
const matJungle = new THREE.MeshStandardMaterial({ map: createPixelTexture('jungle_grass'), roughness: 1.0 });
const matTaiga = new THREE.MeshStandardMaterial({ map: createPixelTexture('taiga_grass'), roughness: 1.0 });
const matSnow = new THREE.MeshStandardMaterial({ map: createPixelTexture('snow'), roughness: 0.9 });

const matDirt = new THREE.MeshStandardMaterial({ map: createPixelTexture('dirt'), roughness: 1.0 });
const matStone = new THREE.MeshStandardMaterial({ map: createPixelTexture('stone'), roughness: 0.9 });
const matGold = new THREE.MeshStandardMaterial({ map: createPixelTexture('gold'), roughness: 0.5, metalness: 0.8 });
const matWood = new THREE.MeshStandardMaterial({ map: createPixelTexture('wood'), roughness: 0.9 });
const matChance = new THREE.MeshStandardMaterial({ map: createPixelTexture('chance_red'), roughness: 0.9 });
const matChest = new THREE.MeshStandardMaterial({ map: createPixelTexture('chest_orange'), roughness: 0.9 });
const matJail = new THREE.MeshStandardMaterial({ map: createPixelTexture('jail_gray'), roughness: 0.8, metalness: 0.5 });

// 辅助函数：生成不同群系的材质数组（上面是群系顶面，四周是泥土/石头等）
function getBiomeMaterials(topMat, sideMat = matDirt) {
    return [
        sideMat, sideMat, topMat, sideMat, sideMat, sideMat
    ];
}

const biomeMaterials = {
    'plains': getBiomeMaterials(matPlains),
    'desert': getBiomeMaterials(matDesert, matDesert), // 沙漠四周也是沙子
    'jungle': getBiomeMaterials(matJungle),
    'taiga': getBiomeMaterials(matTaiga),
    'snow': getBiomeMaterials(matSnow, matDirt) // 雪地下面是泥土
};

// 添加基础光源
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 较亮的环境光
scene.add(ambientLight);

// 添加主平行光，产生阴影 (类似 Minecraft 太阳光)
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(30, 60, -20);
dirLight.castShadow = true;
// 扩大阴影相机范围以覆盖整个棋盘
dirLight.shadow.camera.left = -40;
dirLight.shadow.camera.right = 40;
dirLight.shadow.camera.top = 40;
dirLight.shadow.camera.bottom = -40;
dirLight.shadow.mapSize.width = 2048; // 提高阴影分辨率
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// 4. 创建桌面 (改为一个顶着棋盘的巨大 Minecraft 角色)

// 我们复用之前写的提取皮肤函数 createPlayerSkinMaterials
// 但为了能在这里使用，需要确保 textureLoader 已经在前面声明了，我们将它的声明提升
const textureLoader = new THREE.TextureLoader();

function extractSkinPart(baseTexture, uvMap, partWidth, partHeight) {
    return uvMap.map(uv => {
        const tex = baseTexture.clone();
        tex.needsUpdate = true;
        tex.repeat.set(partWidth / 64, partHeight / 64);
        tex.offset.set(uv.x / 64, uv.y / 64);
        return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    });
}

function createPlayerSkinMaterials(skinName) {
    const baseTexture = textureLoader.load(`./player/${skinName}.png`);
    baseTexture.magFilter = THREE.NearestFilter;
    baseTexture.minFilter = THREE.NearestFilter;
    baseTexture.colorSpace = THREE.SRGBColorSpace;

    // 头 (8x8x8)
    const headUVs = [
        { x: 16, y: 48 }, { x: 0,  y: 48 }, // Right, Left
        { x: 8,  y: 56 }, { x: 16, y: 56 }, // Top, Bottom
        { x: 8,  y: 48 }, { x: 24, y: 48 }  // Front, Back
    ];
    // 身体 (8x12x4)
    const bodyUVs = [
        { x: 28, y: 36 }, { x: 16, y: 36 }, // Right, Left
        { x: 20, y: 48 }, { x: 28, y: 48 }, // Top, Bottom
        { x: 20, y: 36 }, { x: 32, y: 36 }  // Front, Back
    ];
    // 手臂 (4x12x4)
    const armUVs = [
        { x: 48, y: 36 }, { x: 40, y: 36 }, // Right, Left
        { x: 44, y: 48 }, { x: 48, y: 48 }, // Top, Bottom
        { x: 44, y: 36 }, { x: 52, y: 36 }  // Front, Back
    ];
    // 腿部 (4x12x4)
    const legUVs = [
        { x: 8,  y: 36 }, { x: 0,  y: 36 }, // Right, Left
        { x: 4,  y: 48 }, { x: 8,  y: 48 }, // Top, Bottom
        { x: 4,  y: 36 }, { x: 12, y: 36 }  // Front, Back
    ];

    return {
        head: extractSkinPart(baseTexture, headUVs, 8, 8),
        body: extractSkinPart(baseTexture, bodyUVs, 8, 12),
        arm: extractSkinPart(baseTexture, armUVs, 4, 12),
        leg: extractSkinPart(baseTexture, legUVs, 4, 12)
    };
}

// 封装创建人物模型的函数（支持自定义比例大小，以及是否带头顶指示器）
function createPlayerModel(skinName, colorHex, scale = 0.15, withIndicator = true) {
    const group = new THREE.Group();
    const materials = createPlayerSkinMaterials(skinName);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    
    // 几何体
    const headGeo = new THREE.BoxGeometry(8*scale, 8*scale, 8*scale);
    const bodyGeo = new THREE.BoxGeometry(8*scale, 12*scale, 4*scale);
    const limbGeo = new THREE.BoxGeometry(4*scale, 12*scale, 4*scale);
    
    const headEdges = new THREE.EdgesGeometry(headGeo);
    const bodyEdges = new THREE.EdgesGeometry(bodyGeo);
    const limbEdges = new THREE.EdgesGeometry(limbGeo);

    function createPart(geo, mat, edges, x, y, z) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.add(new THREE.LineSegments(edges, edgeMat));
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    // 组装身体部位
    const head = createPart(headGeo, materials.head, headEdges, 0, 24*scale + 4*scale, 0); 
    const body = createPart(bodyGeo, materials.body, bodyEdges, 0, 12*scale + 6*scale, 0); 
    
    // 为了呈现“顶着棋盘”的姿势，让双手高举！
    // 正常下垂是 (±6*s, 18*s, 0)，高举我们把它旋转 180度
    const leftArm = createPart(limbGeo, materials.arm, limbEdges, 6*scale, 12*scale + 6*scale, 0);
    const rightArm = createPart(limbGeo, materials.arm, limbEdges, -6*scale, 12*scale + 6*scale, 0);
    
    const leftLeg = createPart(limbGeo, materials.leg, limbEdges, 2*scale, 6*scale, 0);
    const rightLeg = createPart(limbGeo, materials.leg, limbEdges, -2*scale, 6*scale, 0);

    // 将部位挂载到模型组
    group.add(head);
    group.add(body);
    group.add(leftArm);
    group.add(rightArm);
    group.add(leftLeg);
    group.add(rightLeg);
    
    // 存储引用以便后续更换材质
    group.userData = { head, body, leftArm, rightArm, leftLeg, rightLeg };

    if (withIndicator && colorHex) {
        const indicatorGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
        const indicatorMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        indicator.position.set(0, 32*scale + 0.6, 0);
        indicator.rotation.x = Math.PI; 
        group.add(indicator);
    }

    return group;
}

// ----------------------------------------------------
// 资产管理与交易系统逻辑
// ----------------------------------------------------
let isDebtMode = false;
let tradeOffer = null; // { seller, buyer, cell, price }

// 打开资产管理面板
function openAssetsPanel(player, forceDebtMode = false) {
    const panel = document.getElementById('assetsPanel');
    const list = document.getElementById('assetsList');
    const title = document.getElementById('assetsTitle');
    const warning = document.getElementById('debtWarning');
    const btnClose = document.getElementById('btnCloseAssets');
    
    isDebtMode = forceDebtMode;
    title.innerText = `玩家 ${player.id} 的资产`;
    list.innerHTML = '';
    
    const ownedCells = boardCells.filter(c => c.owner === player);
    
    if (ownedCells.length === 0) {
        list.innerHTML = '<p style="color: #ccc;">暂无任何房产。</p>';
    } else {
        ownedCells.forEach(cell => {
            const div = document.createElement('div');
            div.style.cssText = 'background: rgba(255,255,255,0.1); margin-bottom: 10px; padding: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;';
            
            const info = document.createElement('div');
            // 计算投入的总成本：地价 + 升级费(每次是地价一半)
            const totalCost = cell.price + (cell.level * cell.price * 0.5);
            // 卖给银行是半价
            const bankPrice = totalCost * 0.5;
            
            info.innerHTML = `<strong>${cell.name}</strong> (等级: ${cell.level})<br><span style="font-size: 14px; color: #aaa;">总成本: $${totalCost}</span>`;
            
            const btns = document.createElement('div');
            
            // 卖给银行按钮
            const btnBank = document.createElement('button');
            btnBank.innerText = `卖给银行 ($${bankPrice})`;
            btnBank.style.cssText = 'padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;';
            btnBank.onclick = () => sellToBank(player, cell, bankPrice);
            
            // 卖给玩家按钮 (如果在负债强制模式下，为了简单可以禁用，或者允许。这里我们允许)
            const btnPlayer = document.createElement('button');
            btnPlayer.innerText = '卖给其他玩家';
            btnPlayer.style.cssText = 'padding: 5px 10px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer;';
            btnPlayer.onclick = () => initiateTrade(player, cell);
            
            btns.appendChild(btnBank);
            btns.appendChild(btnPlayer);
            
            div.appendChild(info);
            div.appendChild(btns);
            list.appendChild(div);
        });
    }
    
    if (isDebtMode) {
        warning.style.display = 'block';
        btnClose.style.display = 'none'; // 强制模式下不允许直接关闭
    } else {
        warning.style.display = 'none';
        btnClose.style.display = 'inline-block';
    }
    
    panel.style.display = 'block';
}

function closeAssetsPanel() {
    document.getElementById('assetsPanel').style.display = 'none';
}

function sellToBank(player, cell, price) {
    player.money += price;
    cell.owner = null;
    cell.level = -1;
    // 移除房子模型
    const toRemove = [];
    cell.mesh.children.forEach(child => {
        if (child.userData.isHouse) toRemove.push(child);
    });
    toRemove.forEach(child => cell.mesh.remove(child));
    
    updateStatusUI();
    console.log(`[系统] 玩家 ${player.id} 将 ${cell.name} 以 $${price} 卖给了银行。`);
    
    // 刷新面板
    openAssetsPanel(player, isDebtMode);
    
    // 如果是负债模式且钱已经还清了
    if (isDebtMode && player.money >= 0) {
        isDebtMode = false;
        closeAssetsPanel();
        alert(`债务已还清！`);
        endTurn(); // 恢复回合结束流程
    } else if (isDebtMode && player.money < 0 && boardCells.filter(c => c.owner === player).length === 0) {
        // 房子卖光了还是负债，真破产了
        closeAssetsPanel();
        checkBankruptcy(player); // 这次进去就会判定真破产
        endTurn();
    }
}

let currentTradeSetup = null; // 存储正在设置的交易信息 {seller, cell}

function initiateTrade(seller, cell) {
    // 过滤掉自己和已破产的玩家
    const validBuyers = players.filter(p => p.id !== seller.id && !p.isBankrupt);
    if (validBuyers.length === 0) {
        alert("没有其他玩家可以交易！");
        return;
    }

    currentTradeSetup = { seller, cell };
    
    // 隐藏资产面板，显示交易设置面板
    document.getElementById('assetsPanel').style.display = 'none';
    
    const setupPanel = document.getElementById('tradeSetupPanel');
    document.getElementById('tradeSetupDesc').innerText = `你要出售的房产：[${cell.name}] (等级 ${cell.level})`;
    
    // 填充下拉框
    const select = document.getElementById('tradeBuyerSelect');
    select.innerHTML = '';
    validBuyers.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.innerText = `玩家 ${p.id} (资金: $${p.money})`;
        select.appendChild(option);
    });
    
    // 重置价格输入框
    document.getElementById('tradePriceInput').value = cell.price;
    
    setupPanel.style.display = 'block';
}

document.getElementById('btnCancelTradeSetup').addEventListener('click', () => {
    document.getElementById('tradeSetupPanel').style.display = 'none';
    currentTradeSetup = null;
    // 恢复卖家资产面板
    openAssetsPanel(players[currentPlayerTurn], isDebtMode);
});

document.getElementById('btnConfirmTradeSetup').addEventListener('click', () => {
    if (!currentTradeSetup) return;
    
    const buyerId = parseInt(document.getElementById('tradeBuyerSelect').value);
    const price = parseInt(document.getElementById('tradePriceInput').value);
    
    if (isNaN(price) || price <= 0) {
        alert("请输入有效的金额！");
        return;
    }
    
    const buyer = players.find(p => p.id === buyerId);
    if (!buyer) return;
    
    if (buyer.money < price) {
        alert(`玩家 ${buyer.id} 的钱不够支付这个价格！(对方资金: $${buyer.money})`);
        return;
    }
    
    const { seller, cell } = currentTradeSetup;
    
    // 隐藏设置面板，显示确认面板
    document.getElementById('tradeSetupPanel').style.display = 'none';
    currentTradeSetup = null;
    
    tradeOffer = { seller, buyer, cell, price };
    
    const tradePanel = document.getElementById('tradePanel');
    document.getElementById('tradeDesc').innerText = `玩家 ${seller.id} 想要以 $${price} 将 [${cell.name}] (等级 ${cell.level}) 卖给你！`;
    tradePanel.style.display = 'block';
});

document.getElementById('btnAcceptTrade').addEventListener('click', () => {
    if (!tradeOffer) return;
    const { seller, buyer, cell, price } = tradeOffer;
    
    buyer.money -= price;
    seller.money += price;
    cell.owner = buyer;
    
    // 房子模型颜色需要改变以匹配新主人
    cell.mesh.children.forEach(child => {
        if (child.userData.isHouse) {
            // 如果是大旅馆
            if (cell.level === 3) {
                // child是Group，里面的第一个mesh是body
                child.children[0].material.color.setHex(buyer.hex);
            } else {
                // child是Group，里面的第一个mesh是wall
                child.children[0].material.color.setHex(buyer.hex);
            }
        }
    });
    
    updateStatusUI();
    console.log(`[系统] 玩家 ${buyer.id} 花费 $${price} 从 玩家 ${seller.id} 手中购买了 ${cell.name}。`);
    
    document.getElementById('tradePanel').style.display = 'none';
    tradeOffer = null;
    
    // 回到原来的逻辑：如果是负债模式检查是否还清
    if (isDebtMode) {
        if (seller.money >= 0) {
            isDebtMode = false;
            alert(`交易成功！债务已还清！`);
            endTurn();
        } else {
            openAssetsPanel(seller, true);
        }
    } else {
        openAssetsPanel(seller, false);
    }
});

document.getElementById('btnRejectTrade').addEventListener('click', () => {
    document.getElementById('tradePanel').style.display = 'none';
    tradeOffer = null;
    alert("对方拒绝了你的交易请求。");
    // 恢复卖家面板
    openAssetsPanel(players[currentPlayerTurn], isDebtMode);
});

document.getElementById('btnCloseAssets').addEventListener('click', () => {
    if (!isDebtMode) {
        closeAssetsPanel();
    }
});

document.getElementById('btnManageAssets').addEventListener('click', () => {
    // 只有在空闲状态（没在走路，没在摇骰子）时才能打开资产面板
    if (isRolling || isPlayerMoving) return;
    openAssetsPanel(players[currentPlayerTurn], false);
});

// ----------------------------------------------------

// 创建支撑棋盘的巨人
// 头部的总高度是 32 * scale。我们想要棋盘 (y=0) 刚好在这个巨人的头顶上。
// 假设巨人的 scale 是 10，那么头顶高度是 320，我们需要把它往下移动 -320，让头顶刚好在 y=0
const giantScale = 3; // 放大 30 倍 (基础是 0.1)
const giantPlayer = createPlayerModel('efe', null, giantScale, false);

// 调整巨人的姿势：双手高举托起棋盘
giantPlayer.userData.leftArm.rotation.x = Math.PI; // 左手举起
giantPlayer.userData.leftArm.position.y += 12 * giantScale; // 向上平移补偿旋转轴心
giantPlayer.userData.rightArm.rotation.x = Math.PI; // 右手举起
giantPlayer.userData.rightArm.position.y += 12 * giantScale; 

// 定位：让巨人的双手刚好在 y=0 承托棋盘，不再穿模
// 手臂旋转180度后，手臂的最顶端高度 = 12(原中心) + 12(上移) + 6(半高) = 30 * giantScale
// 为了让最高点在 y=0，整个模型需要下沉 (30 * giantScale) 的距离
giantPlayer.position.y = - (36.6 * giantScale); // 这里的原始计算，我们会在后面创建底座时进一步调整
scene.add(giantPlayer);

// 5. 创建大富翁棋盘 (我的世界风格方块)
const boardGroup = new THREE.Group();
const blockSize = 6; // 增大每个方块的大小以容纳全身玩家和装饰
const boardSize = 10; // 棋盘边长（10x10，总共 36 个格子）
const offset = (boardSize * blockSize) / 2 - (blockSize / 2);

// 创建棋盘底座 (一块大木板)，让巨人托在手中
const baseThickness = 2; // 底座厚度
const baseSize = boardSize * blockSize; // 底座边长
const baseGeo = new THREE.BoxGeometry(baseSize, baseThickness, baseSize);
const baseMesh = new THREE.Mesh(baseGeo, matWood); // 使用木头材质
// 因为方块的中心在 y=0，高度是6 (y范围是-3到3)
// 我们把底座放在方块下面，也就是 y = -3 - baseThickness/2 = -4
baseMesh.position.set(0, -3 - baseThickness/2, 0);
baseMesh.receiveShadow = true;
baseMesh.castShadow = true;

// 添加底座黑边框
const baseEdges = new THREE.EdgesGeometry(baseGeo);
const baseLine = new THREE.LineSegments(baseEdges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
baseMesh.add(baseLine);

boardGroup.add(baseMesh);

// 调整巨人的位置，让手托在底座下方
// 底座的底部 y 坐标是 -3 - baseThickness = -5
// 原来巨人的最高点是 y=0，现在我们要把它往下移 5 个单位
giantPlayer.position.y = - (36.6 * giantScale) - 5;

// 保存棋盘路径（格子中心坐标），按顺时针顺序收集
const pathPositions = [];
const boardCells = []; // 保存所有格子数据

// 方块几何体 (完整的正方体，更像Minecraft方块)
const boxGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);

// 黑色边框材质（我的世界方块线条感）
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

// 辅助数组，用于按顺时针顺序生成格子
const gridCoords = [];
// 上边 (从左到右)
for (let j = 0; j < boardSize; j++) gridCoords.push({ i: 0, j: j });
// 右边 (从上到下)
for (let i = 1; i < boardSize; i++) gridCoords.push({ i: i, j: boardSize - 1 });
// 下边 (从右到左)
for (let j = boardSize - 2; j >= 0; j--) gridCoords.push({ i: boardSize - 1, j: j });
// 左边 (从下到上)
for (let i = boardSize - 2; i > 0; i--) gridCoords.push({ i: i, j: 0 });

// 全局字体变量，用于在其他地方生成文字
let globalFont = null;

// 加载字体
const fontLoader = new FontLoader();
fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', function (font) {
    globalFont = font; // 保存到全局
    
    // 初始化所有卡片的背面文字
    if (typeof cards !== 'undefined') {
        cards.forEach(c => updateSpecificCardText(c, "", "机会卡\nChance"));
    }
    
    gridCoords.forEach((coord, index) => {
        const { i, j } = coord;
        
        // 决定群系类型 (按每条边分配不同的群系)
        // 边长 10 的棋盘，总共有 10*4 - 4 = 36 个格子。
        // 每条边除去两端角，中间有 8 个格子。
        // 角落：0, 9, 18, 27
        let biomeKey = 'plains';
        let biomeName = '平原';
        if (index > 0 && index < 9) {
            biomeKey = 'plains'; biomeName = '平原';
        } else if (index > 9 && index < 18) {
            biomeKey = 'desert'; biomeName = '沙漠';
        } else if (index > 18 && index < 27) {
            biomeKey = 'taiga'; biomeName = '针叶林';
        } else if (index > 27 && index < 36) {
            biomeKey = 'snow'; biomeName = '雪原';
        }
        
        // 如果是偶数格子，用石头材质增加纹理变化，奇数格子用群系材质
        let currentMat = (i + j) % 2 === 0 ? matStone : biomeMaterials[biomeKey];
        
        // 如果是四个角落，用金块材质
        const isCorner = (i === 0 && j === 0) || 
                         (i === 0 && j === boardSize - 1) || 
                         (i === boardSize - 1 && j === 0) || 
                         (i === boardSize - 1 && j === boardSize - 1);
                         
        let type = 'property';
        let name = `${biomeName} ${index}`;

        // 角落索引：0, 9, 18, 27
        if (index === 0) {
            currentMat = matGold;
            type = 'start';
            name = '起点';
        } else if (index === 18) {
            currentMat = matJail;
            type = 'jail';
            name = '警察局(入狱)';
        } else if (index === 9 || index === 27) {
            currentMat = matGold;
            type = 'corner';
            name = '休息区';
        } else if (index === 4 || index === 22) { // 每边中间位置作为机会
            currentMat = matChance;
            type = 'card';
            name = '机会卡';
        } else if (index === 14 || index === 32) { // 每边中间位置作为交税
            currentMat = matStone;
            type = 'tax';
            name = '交税';
        }

        const posX = i * blockSize - offset;
        const posZ = j * blockSize - offset;

        // 创建方块网格
        const block = new THREE.Mesh(boxGeo, currentMat);
        // Y位置设为0，因为几何体高度为6，中心在原点，所以顶部就是Y=3
        block.position.set(posX, 0, posZ);
        block.castShadow = true;
        block.receiveShadow = true;

        // 在格子上添加文字
        const textGeo = new TextGeometry(name, {
            font: font,
            size: 0.5,
            height: 0.1,
        });
        textGeo.computeBoundingBox();
        const centerOffset = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);
        
        const textMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const textMesh = new THREE.Mesh(textGeo, textMat);
        
        // 将文字放在方块顶部中心
        textMesh.position.set(centerOffset, blockSize * 0.5 + 0.05, 0);
        
        // 让文字朝向外侧（或者朝向中心）
        if (i === 0) textMesh.rotation.y = Math.PI / 2;
        else if (i === boardSize - 1) textMesh.rotation.y = -Math.PI / 2;
        else if (j === 0) textMesh.rotation.y = 0;
        else if (j === boardSize - 1) textMesh.rotation.y = Math.PI;

        // 如果文字超出了格子大小，可以在此进行缩放调整
        
        block.add(textMesh);

        // 添加装饰物
        if (type === 'property') {
            if (biomeKey === 'desert' && (i + j) % 2 !== 0) {
                // 添加仙人掌
                const cactusGeo = new THREE.BoxGeometry(0.8, 2, 0.8);
                const cactusMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 });
                const cactus = new THREE.Mesh(cactusGeo, cactusMat);
                cactus.position.set(1.5, blockSize * 0.5 + 1, -1.5);
                cactus.castShadow = true;
                block.add(cactus);
            } else if (biomeKey === 'taiga' && (i + j) % 2 !== 0) {
                // 添加云杉树 (简单用圆锥表示)
                const treeGeo = new THREE.ConeGeometry(1, 3, 4);
                const treeMat = new THREE.MeshStandardMaterial({ color: 0x2f4f4f, roughness: 0.9 });
                const tree = new THREE.Mesh(treeGeo, treeMat);
                tree.position.set(-1.5, blockSize * 0.5 + 1.5, 1.5);
                tree.castShadow = true;
                block.add(tree);
            } else if (biomeKey === 'snow' && (i + j) % 2 !== 0) {
                // 添加雪人
                const snowGeo = new THREE.BoxGeometry(1, 1, 1);
                const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
                const snowman = new THREE.Mesh(snowGeo, snowMat);
                snowman.position.set(1.5, blockSize * 0.5 + 0.5, 1.5);
                
                const snowHead = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), snowMat);
                snowHead.position.set(0, 0.9, 0);
                snowman.add(snowHead);
                
                snowman.castShadow = true;
                block.add(snowman);
            }
        }

        // 记录路径点位置 (方块上方，即Y=3的地方)
        const posVec = new THREE.Vector3(posX, blockSize * 0.5, posZ);
        pathPositions.push(posVec);
        
        let price = 0;
        let rent = 0;
        if (type === 'property') {
            price = 50 + index * 10;
            rent = Math.floor(price * 0.2); // 基础租金为价格的20%
        } else if (type === 'tax') {
            price = 200; // 借用price字段存交税金额
        }

        // 记录格子逻辑数据 (完全符合新要求)
        boardCells.push({
            index: index,
            type: type, // start / property / tax / card / jail / corner
            name: name,
            biome: biomeKey,
            price: price,
            rent: rent,
            owner: null,
            level: -1, // -1 表示没有房子, 0表示1级(买地), 1-3表示房子等级
            mesh: block
        });

        // 添加方块黑边框
        const line = new THREE.LineSegments(edgesGeo, lineMat);
        block.add(line);

        boardGroup.add(block);
    });
    scene.add(boardGroup);
    
    // 因为是异步加载，棋盘生成完毕后需要更新一下玩家的初始位置
    updateAllPlayersPosition();
});

// --- 5.2 玩家配置 ---
const playerConfigs = [
    { skin: 'steve', colorName: '红色', colorHex: '#ff3333', hex: 0xff3333 },
    { skin: 'alex', colorName: '蓝色', colorHex: '#3333ff', hex: 0x3333ff },
    { skin: 'ari', colorName: '绿色', colorHex: '#33ff33', hex: 0x33ff33 },
    { skin: 'efe', colorName: '黄色', colorHex: '#ffff33', hex: 0xffff33 },
    { skin: 'kai', colorName: '紫色', colorHex: '#ff33ff', hex: 0xff33ff },
    { skin: 'makena', colorName: '青色', colorHex: '#33ffff', hex: 0x33ffff },
    { skin: 'noor', colorName: '橙色', colorHex: '#ff8800', hex: 0xff8800 },
    { skin: 'sunny', colorName: '粉色', colorHex: '#ff8888', hex: 0xff8888 },
    { skin: 'zuri', colorName: '棕色', colorHex: '#8B4513', hex: 0x8B4513 },
    { skin: 'steve', colorName: '灰色', colorHex: '#888888', hex: 0x888888 }
];

let players = [];
let currentPlayerTurn = 0;

// 更新皮肤的辅助函数
function updatePlayerSkin(playerGroup, skinName) {
    const materials = createPlayerSkinMaterials(skinName);
    const parts = playerGroup.userData;
    
    parts.head.material = materials.head;
    parts.body.material = materials.body;
    parts.leftArm.material = materials.arm;
    parts.rightArm.material = materials.arm;
    parts.leftLeg.material = materials.leg;
    parts.rightLeg.material = materials.leg;
}

// 初始化游戏函数
function initGame(playerCount) {
    // 清除可能存在的旧玩家
    players.forEach(p => scene.remove(p.group));
    players = [];
    
    const statusUI = document.getElementById('statusUI');
    const skinContainer = document.getElementById('playerSkinsContainer');
    statusUI.innerHTML = '';
    skinContainer.innerHTML = '';

    for (let i = 0; i < playerCount; i++) {
        const config = playerConfigs[i % playerConfigs.length];
        const model = createPlayerModel(config.skin, config.hex);
        scene.add(model);

        // 计算偏移量，让多个玩家在同一个格子上时分散开
        // 10人分散在一个 4x4 的格子上
        const angle = (i / playerCount) * Math.PI * 2;
        const radius = 1.2;
        const offsetX = Math.cos(angle) * radius;
        const offsetZ = Math.sin(angle) * radius;

        const player = {
            id: i + 1,
            name: `玩家 ${i + 1}`, // 符合要求的 name
            group: model,
            colorName: config.colorName,
            colorHex: config.colorHex,
            hex: config.hex,
            position: 0, // 符合要求的 position
            currentIndex: 0, // 兼容旧逻辑
            money: 2000,
            properties: [], // 符合要求的 properties 数组
            offset: { x: offsetX, z: offsetZ },
            jailTurns: 0,
            jailCount: 0,
            isBankrupt: false
        };
        players.push(player);

        // 创建状态 UI
        const statusEl = document.createElement('div');
        statusEl.id = `p${player.id}Status`;
        statusEl.style.color = player.colorHex;
        statusEl.style.fontWeight = 'bold';
        statusUI.appendChild(statusEl);

        // 创建皮肤选择 UI
        const skinDiv = document.createElement('div');
        skinDiv.style.cssText = 'margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #555;';
        skinDiv.innerHTML = `
            <label for="p${player.id}Skin" style="color: ${player.colorHex};">玩家 ${player.id} 皮肤:</label>
            <select id="p${player.id}Skin" style="padding: 5px; border-radius: 4px; margin-top: 5px; width: 100%;">
                <option value="steve" ${config.skin === 'steve' ? 'selected' : ''}>Steve</option>
                <option value="alex" ${config.skin === 'alex' ? 'selected' : ''}>Alex</option>
                <option value="efe" ${config.skin === 'efe' ? 'selected' : ''}>Efe</option>
                <option value="ari" ${config.skin === 'ari' ? 'selected' : ''}>Ari</option>
                <option value="kai" ${config.skin === 'kai' ? 'selected' : ''}>Kai</option>
                <option value="makena" ${config.skin === 'makena' ? 'selected' : ''}>Makena</option>
                <option value="noor" ${config.skin === 'noor' ? 'selected' : ''}>Noor</option>
                <option value="sunny" ${config.skin === 'sunny' ? 'selected' : ''}>Sunny</option>
                <option value="zuri" ${config.skin === 'zuri' ? 'selected' : ''}>Zuri</option>
            </select>
        `;
        skinContainer.appendChild(skinDiv);

        // 绑定皮肤更换事件
        document.getElementById(`p${player.id}Skin`).addEventListener('change', (e) => {
            updatePlayerSkin(model, e.target.value);
            console.log(`[系统] 玩家 ${player.id} 更换了皮肤: ${e.target.value}`);
        });
    }

    currentPlayerTurn = 0;
    updateAllPlayersPosition();
    updateStatusUI();
    
    // 初始化回合显示
    const firstPlayer = players[0];
    const turnEl = document.getElementById('turnText');
    turnEl.innerText = `当前回合: 玩家 ${firstPlayer.id} (${firstPlayer.colorName})`;
    turnEl.style.color = firstPlayer.colorHex;
}

// 监听开始游戏按钮
document.getElementById('btnStartGame').addEventListener('click', () => {
    const countInput = document.getElementById('playerCount');
    let count = parseInt(countInput.value);
    if (isNaN(count) || count < 2) count = 2;
    if (count > 10) count = 10;

    initGame(count);

    document.getElementById('lobbyUI').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
});

// 监听桌面巨人皮肤更换
document.getElementById('giantSkin').addEventListener('change', (e) => {
    updatePlayerSkin(giantPlayer, e.target.value);
    console.log(`[系统] 桌面巨人更换了皮肤: ${e.target.value}`);
});

// 动画移动状态
let playerTargetIndex = 0;
let isPlayerMoving = false;
let playerMoveProgress = 0;
let movingFromVec = new THREE.Vector3();
let movingToVec = new THREE.Vector3();

// 更新所有玩家位置
function updateAllPlayersPosition() {
    players.forEach(p => {
        const pos = pathPositions[p.currentIndex];
        // 加上偏移量防止两个棋子重叠在一起。人物脚底在Y=0，格子表面Y是在 pathPositions 里面算好的 (y=2)
        p.group.position.set(pos.x + p.offset.x, pos.y, pos.z + p.offset.z);
        // 让玩家面向棋盘中心
        p.group.lookAt(0, p.group.position.y, 0);
    });
}
// updateAllPlayersPosition();

// 统一的 UI 更新函数
function updateUI() {
    players.forEach(p => {
        const statusEl = document.getElementById(`p${p.id}Status`);
        if (statusEl) {
            statusEl.innerText = `${p.name}: $${p.money}${p.isBankrupt ? ' (破产)' : ''}`;
        }
    });
}

// 为了兼容旧代码，将原有的 updateStatusUI 映射到新的 updateUI
const updateStatusUI = updateUI;

function checkBankruptcy(player) {
    if (player.money < 0 && !player.isBankrupt) {
        // 检查是否有房产可以变卖
        const ownedCells = boardCells.filter(c => c.owner === player);
        if (ownedCells.length > 0) {
            // 还有房产，强制要求变卖
            alert(`玩家 ${player.id}，你的资金为负（$${player.money}）！你必须变卖房产还债！`);
            openAssetsPanel(player, true);
            return false; // 尚未真正破产，只是在变卖阶段
        } else {
            // 真正破产
            player.isBankrupt = true;
            player.group.visible = false;
            
            alert(`玩家 ${player.id} 破产了！游戏结束！`);
            console.log(`[系统] 玩家 ${player.id} 宣告破产，资产已被清空。`);
            updateStatusUI();
            return true;
        }
    }
    return false;
}

function endTurn() {
    // 隐藏可能未关闭的提示
    document.getElementById('eventText').style.display = 'none';
    
    // 如果有被翻开的卡片，将其翻转回去
    if (selectedCard && isCardFaceUp && !isCardFlipping) {
        selectedCard.rotation.x = Math.PI / 2; // 重新面朝下
        updateSpecificCardText(selectedCard, "", "机会卡\nChance");
        selectedCard = null;
        isCardFaceUp = false;
    }
    
    // 破产检查
    let anyoneBankrupt = false;
    for (let p of players) {
        // 如果 checkBankruptcy 返回 true 表示真的破产了；
        // 如果它打开了变卖面板，那么当前回合挂起，不应继续往下走 endTurn 逻辑。
        // 这里我们需要一个机制：如果是变卖中，我们中止 endTurn
        if (p.money < 0 && !p.isBankrupt) {
            checkBankruptcy(p);
            return; // 中止回合结束流程，等待玩家卖房
        }
        if (p.isBankrupt) anyoneBankrupt = true;
    }
    
    // 检查是否有人真正破产，如果有，就不再继续回合
    if (anyoneBankrupt) {
        return;
    }

    // 切换回合 (跳过已破产的玩家)
    do {
        currentPlayerTurn = (currentPlayerTurn + 1) % players.length;
    } while (players[currentPlayerTurn].isBankrupt);

    const nextPlayer = players[currentPlayerTurn];
    const turnEl = document.getElementById('turnText');
    turnEl.innerText = `当前回合: 玩家 ${nextPlayer.id} (${nextPlayer.colorName})`;
    turnEl.style.color = nextPlayer.colorHex;
    console.log(`[系统] 切换至玩家 ${nextPlayer.id} 的回合`);
    
    // 如果下个玩家在停赛/监狱中
    if (nextPlayer.jailTurns > 0) {
        nextPlayer.jailTurns -= 1;
        const msg = `🚨 玩家 ${nextPlayer.id} 处于停赛状态，剩余 ${nextPlayer.jailTurns} 回合。跳过本回合！`;
        console.log(`[事件] ${msg}`);
        const eventEl = document.getElementById('eventText');
        eventEl.innerText = msg;
        eventEl.style.display = 'block';
        setTimeout(endTurn, 2000);
    }
}

function addHouseToCell(cell, colorHex, level) {
    // 每次升级前，清除旧的房子（如果想要替换为大建筑的话）
    // 但为了大富翁经典感觉，1-3级我们建小房子，满级(3级)我们建一个大旅馆
    if (level === 3) {
        // 满级：清除之前的小房子
        const toRemove = [];
        cell.mesh.children.forEach(child => {
            if (child.userData.isHouse) toRemove.push(child);
        });
        toRemove.forEach(child => cell.mesh.remove(child));
        
        // 建造一个大旅馆 (Hotel) - 根据群系不同改变材质
        const hotelGroup = new THREE.Group();
        hotelGroup.userData.isHouse = true;

        let bodyMatColor = colorHex;
        let roofMatColor = 0x333333;
        
        if (cell.biome === 'snow') {
            roofMatColor = 0xffffff; // 雪原：白雪屋顶
        } else if (cell.biome === 'desert') {
            bodyMatColor = 0xeedd82; // 沙漠：沙岩色主体
            roofMatColor = 0xd2b48c; // 沙漠：平顶沙色
        } else if (cell.biome === 'taiga') {
            roofMatColor = 0x2f4f4f; // 针叶林：深绿色屋顶
        }

        // 旅馆主体
        const bodyGeo = new THREE.BoxGeometry(2.4, 2.5, 2.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: bodyMatColor, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })));
        body.position.y = 1.25;
        body.castShadow = true;
        body.receiveShadow = true;
        hotelGroup.add(body);

        // 旅馆屋顶 (用平顶或者多层)
        const roofGeo = new THREE.BoxGeometry(2.6, 0.4, 2.6);
        const roofMat = new THREE.MeshStandardMaterial({ color: roofMatColor, roughness: 0.9 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.add(new THREE.LineSegments(new THREE.EdgesGeometry(roofGeo), new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })));
        roof.position.y = 2.5 + 0.2;
        roof.castShadow = true;
        hotelGroup.add(roof);
        
        // 玩家标识（显示是谁的房子，因为有些群系可能改变了房子主色调）
        const ownerIndicatorGeo = new THREE.BoxGeometry(1, 0.2, 1);
        const ownerIndicatorMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const ownerIndicator = new THREE.Mesh(ownerIndicatorGeo, ownerIndicatorMat);
        ownerIndicator.position.y = 2.5 + 0.4 + 0.1;
        hotelGroup.add(ownerIndicator);

        // 格子高度是6，中心在y=0，顶部是y=3
        hotelGroup.position.set(0, 3, 0); 
        cell.mesh.add(hotelGroup);

    } else {
        // 1-3 级：建造带有尖顶的小房子
        const houseGroup = new THREE.Group();
        houseGroup.userData.isHouse = true;
        
        const s = 1.0; // 房子基础大小
        
        // 偏移位置以免不同等级的房子重叠 (放在格子四角)
        const offsetMap = [
            {x: -1.5, z: -1.5}, // 第1栋 (level 0)
            {x: 1.5, z: -1.5},  // 第2栋 (level 1)
            {x: -1.5, z: 1.5}   // 第3栋 (level 2)
        ];
        const pos = offsetMap[level] || {x:0, z:0};
        
        if (cell.biome === 'snow') {
            // 雪原：圆顶雪屋 (Igloo)
            const domeGeo = new THREE.SphereGeometry(s * 0.7, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
            const domeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }); // 白色雪
            const dome = new THREE.Mesh(domeGeo, domeMat);
            dome.add(new THREE.LineSegments(new THREE.EdgesGeometry(domeGeo), new THREE.LineBasicMaterial({ color: 0xcccccc, linewidth: 1 })));
            dome.position.y = 0;
            dome.castShadow = true;
            houseGroup.add(dome);
            
            // 玩家标识
            const flagGeo = new THREE.ConeGeometry(0.3, 0.5, 4);
            const flagMat = new THREE.MeshBasicMaterial({ color: colorHex });
            const flag = new THREE.Mesh(flagGeo, flagMat);
            flag.position.y = s * 0.7 + 0.25;
            houseGroup.add(flag);
            
        } else if (cell.biome === 'taiga') {
            // 针叶林：树屋 (悬空在木柱上)
            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.2, s);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // 树干
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = s / 2;
            trunk.castShadow = true;
            houseGroup.add(trunk);
            
            const leavesGeo = new THREE.BoxGeometry(s*1.2, s*0.8, s*1.2);
            const leavesMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8 }); // 用玩家颜色作为树屋主体
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.add(new THREE.LineSegments(new THREE.EdgesGeometry(leavesGeo), new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })));
            leaves.position.y = s + (s*0.8)/2;
            leaves.castShadow = true;
            houseGroup.add(leaves);
            
        } else if (cell.biome === 'desert') {
            // 沙漠：地下室/半掩埋建筑 (矮平顶)
            const baseGeo = new THREE.BoxGeometry(s*1.2, s*0.4, s*1.2);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0xeedd82, roughness: 0.9 }); // 沙岩色
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })));
            base.position.y = (s*0.4)/2;
            base.castShadow = true;
            houseGroup.add(base);
            
            // 地下室入口 (玩家颜色)
            const doorGeo = new THREE.BoxGeometry(s*0.6, s*0.2, s*0.6);
            const doorMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8 });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.add(new THREE.LineSegments(new THREE.EdgesGeometry(doorGeo), new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })));
            door.position.y = s*0.4 + (s*0.2)/2;
            door.castShadow = true;
            houseGroup.add(door);
            
        } else {
            // 平原：经典带尖顶的小房子
            const wallGeo = new THREE.BoxGeometry(s, s, s);
            const wallMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8 });
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.add(new THREE.LineSegments(new THREE.EdgesGeometry(wallGeo), new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })));
            wall.position.y = s/2;
            wall.castShadow = true;
            wall.receiveShadow = true;
            houseGroup.add(wall);

            const roofGeo = new THREE.ConeGeometry(s * 0.8, s * 0.8, 4);
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // 棕色屋顶
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.add(new THREE.LineSegments(new THREE.EdgesGeometry(roofGeo), new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })));
            roof.position.y = s + (s * 0.8)/2;
            roof.rotation.y = Math.PI / 4;
            roof.castShadow = true;
            houseGroup.add(roof);
        }

        // 格子高度是6，中心在y=0，顶部是y=3
        houseGroup.position.set(pos.x, 3, pos.z);
        cell.mesh.add(houseGroup);
    }
}

// 记录当前卡片效果供翻面后使用
let pendingCardEffect = null;

function onPlayerLand(player, tile) {
    const eventEl = document.getElementById('eventText');
    console.log(`[事件] ${player.name} 到达了格子: ${tile.name} (类型: ${tile.type})`);
    
    if (tile.type === 'start') {
        player.money += 2000;
        eventEl.innerText = `🎁 ${player.name} 经过/到达起点，获得 2000 金币！`;
        console.log(`[事件] ${player.name} 获得 2000 金币`);
        eventEl.style.display = 'block';
        updateUI();
        setTimeout(endTurn, 1500);

    } else if (tile.type === 'property') {
        if (!tile.owner) {
            // 无人空地
            console.log(`[事件] 提示购买：${tile.name}，价格：$${tile.price}`);
            // 使用 confirm() 实现购买提示
            const wantsToBuy = confirm(`是否花费 $${tile.price} 购买 ${tile.name}？`);
            if (wantsToBuy) {
                if (player.money >= tile.price) {
                    player.money -= tile.price;
                    tile.owner = player;
                    tile.level = 0;
                    player.properties.push(tile);
                    addHouseToCell(tile, player.colorHex, tile.level);
                    console.log(`[事件] ${player.name} 花费 $${tile.price} 购买了 ${tile.name}`);
                } else {
                    alert("金币不足，无法购买！");
                    console.log(`[事件] ${player.name} 金币不足，购买失败`);
                }
            } else {
                console.log(`[事件] ${player.name} 放弃购买 ${tile.name}`);
            }
            updateUI();
            endTurn();

        } else if (tile.owner === player) {
            // 自己的地
            console.log(`[事件] 这是 ${player.name} 的地`);
            eventEl.innerText = `🏠 欢迎回到你的地盘：${tile.name}。`;
            eventEl.style.display = 'block';
            updateUI();
            setTimeout(endTurn, 1500);

        } else {
            // 别人的地，付租金
            const rent = tile.rent * (tile.level + 1); // 简单计算一下租金加成
            player.money -= rent;
            tile.owner.money += rent;
            eventEl.innerText = `💸 ${player.name} 支付了 $${rent} 租金给 ${tile.owner.name}。`;
            eventEl.style.display = 'block';
            console.log(`[事件] ${player.name} 支付租金 $${rent} 给 ${tile.owner.name}`);
            updateUI();
            setTimeout(endTurn, 2000);
        }

    } else if (tile.type === 'tax') {
        const taxAmount = tile.price; // 借用了 price 字段存税金
        player.money -= taxAmount;
        eventEl.innerText = `💸 ${player.name} 缴纳了 ${taxAmount} 金币税款！`;
        eventEl.style.display = 'block';
        console.log(`[事件] ${player.name} 扣除 ${taxAmount} 金币交税`);
        updateUI();
        setTimeout(endTurn, 1500);

    } else if (tile.type === 'card') {
        eventEl.innerText = `🃏 ${player.name} 抽到了机会卡！请在中间的牌堆中自选一张。`;
        eventEl.style.display = 'block';
        console.log(`[事件] ${player.name} 触发机会卡`);
        
        isWaitingForCardPick = true;

    } else if (tile.type === 'jail') {
        player.jailCount = (player.jailCount || 0) + 1;
        
        // 稍微延迟，确保玩家棋子已经渲染在格子上
        setTimeout(() => {
            if (player.jailCount <= 2) {
                const fine = Math.floor(Math.random() * 301) + 200; // 200 到 500 之间的随机数
                console.log(`[事件] ${player.name} 第 ${player.jailCount} 次入狱，提示缴纳保释金：$${fine}`);
                
                const wantsToPay = confirm(`你被抓进警察局了！这是你第 ${player.jailCount} 次入狱。\n是否缴纳 $${fine} 保释金立即出狱？`);
                if (wantsToPay) {
                    if (player.money >= fine) {
                        player.money -= fine;
                        eventEl.innerText = `👮 ${player.name} 缴纳了 $${fine} 保释金，免于停赛！`;
                        console.log(`[事件] ${player.name} 缴纳 $${fine} 保释金出狱`);
                    } else {
                        alert("金币不足，无法缴纳保释金！只能乖乖坐牢。");
                        player.jailTurns = 2;
                        eventEl.innerText = `👮 ${player.name} 金币不足，入狱停赛 2 回合。`;
                        console.log(`[事件] ${player.name} 金币不足，入狱停赛 2 回合`);
                    }
                } else {
                    player.jailTurns = 2;
                    eventEl.innerText = `👮 ${player.name} 拒绝缴纳保释金，入狱停赛 2 回合。`;
                    console.log(`[事件] ${player.name} 拒绝缴纳保释金，入狱停赛 2 回合`);
                }
            } else {
                // 第三次及以上，不能保释
                player.jailTurns = 2;
                eventEl.innerText = `👮 ${player.name} 已经是第 ${player.jailCount} 次进局子了，不准保释！停赛 2 回合。`;
                console.log(`[事件] ${player.name} 第 ${player.jailCount} 次入狱，不可保释，停赛 2 回合`);
            }
            
            eventEl.style.display = 'block';
            updateUI();
            setTimeout(endTurn, 2000);
        }, 50);

    } else if (tile.type === 'corner') {
        player.money += 200;
        eventEl.innerText = `🎁 ${player.name} 在休息区休息，获得 200 金币！`;
        console.log(`[事件] ${player.name} 获得休息区奖励 200 金币`);
        eventEl.style.display = 'block';
        updateUI();
        setTimeout(endTurn, 1500);
    }
}

// 绑定动作面板按钮事件
document.getElementById('btnBuy').addEventListener('click', () => {
    const player = players[currentPlayerTurn];
    const cell = boardCells[player.currentIndex];
    if (player.money >= cell.price) {
        player.money -= cell.price;
        cell.owner = player;
        cell.level = 0; 
        addHouseToCell(cell, player.colorHex, cell.level);
        document.getElementById('actionPanel').style.display = 'none';
        updateStatusUI();
        console.log(`[事件] 玩家 ${player.id} 花费 $${cell.price} 购买了 ${cell.name}`);
        endTurn();
    } else {
        alert("金币不足！");
    }
});

document.getElementById('btnUpgrade').addEventListener('click', () => {
    const player = players[currentPlayerTurn];
    const cell = boardCells[player.currentIndex];
    const upgPrice = cell.price * 0.5;
    if (player.money >= upgPrice) {
        player.money -= upgPrice;
        cell.level += 1;
        addHouseToCell(cell, player.colorHex, cell.level);
        document.getElementById('actionPanel').style.display = 'none';
        updateStatusUI();
        console.log(`[事件] 玩家 ${player.id} 花费 $${upgPrice} 升级了 ${cell.name} (当前等级: ${cell.level})`);
        endTurn();
    } else {
        alert("金币不足！");
    }
});

document.getElementById('btnSkip').addEventListener('click', () => {
    document.getElementById('actionPanel').style.display = 'none';
    console.log(`[事件] 玩家跳过了操作`);
    endTurn();
});

// --- 5.5 添加 3D 骰子 ---
// 动态使用 Canvas 生成骰子的 6 个面贴图
function createDiceTexture(number) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // 背景色（略带米黄，更有质感）
    ctx.fillStyle = '#fdf5e6';
    ctx.fillRect(0, 0, 256, 256);
    
    // 黑色边框
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(0, 0, 256, 256);
    
    // 画点点
    ctx.fillStyle = '#000000';
    if (number === 1 || number === 4) ctx.fillStyle = '#cc0000'; // 1和4标红，传统骰子习惯
    
    const radius = 24;
    const center = 128;
    const offset = 64;
    
    function drawDot(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if ([1, 3, 5].includes(number)) drawDot(center, center); // 中心点
    if ([2, 3, 4, 5, 6].includes(number)) {
        drawDot(center - offset, center - offset); // 左上
        drawDot(center + offset, center + offset); // 右下
    }
    if ([4, 5, 6].includes(number)) {
        drawDot(center - offset, center + offset); // 左下
        drawDot(center + offset, center - offset); // 右上
    }
    if (number === 6) {
        drawDot(center - offset, center); // 左中
        drawDot(center + offset, center); // 右中
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // 提升清晰度
    return texture;
}

// BoxGeometry 的材质顺序：右、左、上、下、前、后
const diceMaterials = [
    new THREE.MeshStandardMaterial({ map: createDiceTexture(2), roughness: 0.8 }), // 右 (+x)
    new THREE.MeshStandardMaterial({ map: createDiceTexture(5), roughness: 0.8 }), // 左 (-x)
    new THREE.MeshStandardMaterial({ map: createDiceTexture(1), roughness: 0.8 }), // 上 (+y)
    new THREE.MeshStandardMaterial({ map: createDiceTexture(6), roughness: 0.8 }), // 下 (-y)
    new THREE.MeshStandardMaterial({ map: createDiceTexture(3), roughness: 0.8 }), // 前 (+z)
    new THREE.MeshStandardMaterial({ map: createDiceTexture(4), roughness: 0.8 })  // 后 (-z)
];

const diceGeo = new THREE.BoxGeometry(2, 2, 2);
const dice1 = new THREE.Mesh(diceGeo, diceMaterials);
dice1.position.set(-1.5, 1, 0); // 第一个骰子稍微偏左
dice1.castShadow = true;
dice1.receiveShadow = true;
scene.add(dice1);

const dice2 = new THREE.Mesh(diceGeo, diceMaterials);
dice2.position.set(1.5, 1, 0); // 第二个骰子稍微偏右
dice2.castShadow = true;
dice2.receiveShadow = true;
scene.add(dice2);

// 添加骰子的黑色轮廓边框
const diceEdges = new THREE.EdgesGeometry(diceGeo);
const diceLineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
dice1.add(new THREE.LineSegments(diceEdges, diceLineMat));
dice2.add(new THREE.LineSegments(diceEdges, diceLineMat));

// 骰子动画状态变量
let isRolling = false;
let rollStartTime = 0;
let rollResult1 = 1;
let rollResult2 = 1;
let rollTotal = 2;
let slerpStarted = false;

const targetQuaternion1 = new THREE.Quaternion();
const targetQuaternion2 = new THREE.Quaternion();
const startQuaternion1 = new THREE.Quaternion();
const startQuaternion2 = new THREE.Quaternion();

// 辅助函数：根据点数计算对应的欧拉角
function getDiceEuler(number) {
    const euler = new THREE.Euler();
    switch(number) {
        case 1: euler.set(0, 0, 0); break;               // 1在上 (+y)
        case 2: euler.set(0, 0, Math.PI / 2); break;     // 2在右 (+x)
        case 3: euler.set(-Math.PI / 2, 0, 0); break;    // 3在前 (+z)
        case 4: euler.set(Math.PI / 2, 0, 0); break;     // 4在后 (-z)
        case 5: euler.set(0, 0, -Math.PI / 2); break;    // 5在左 (-x)
        case 6: euler.set(Math.PI, 0, 0); break;         // 6在下 (-y)
    }
    return euler;
}

// 绑定掷骰子按钮事件
document.getElementById('rollBtn').addEventListener('click', () => {
    // 如果正在掷骰子、玩家正在移动，或正在等待抽卡，则不可再次点击
    if (isRolling || isPlayerMoving || isWaitingForCardPick) return;
    
    const currentPlayer = players[currentPlayerTurn];
    console.log(`[游戏状态] 回合开始: 玩家 ${currentPlayer.id} 准备掷骰子...`);

    isRolling = true;
    slerpStarted = false;
    rollStartTime = performance.now();
    
    // 生成两个 1-6 的随机数
    rollResult1 = Math.floor(Math.random() * 6) + 1;
    rollResult2 = Math.floor(Math.random() * 6) + 1;
    rollTotal = rollResult1 + rollResult2;
    
    // 隐藏上次的文字结果
    document.getElementById('resultText').style.display = 'none';
    document.getElementById('eventText').style.display = 'none';
    document.getElementById('actionPanel').style.display = 'none';
    
    // 重置卡片选择状态
    isWaitingForCardPick = false;
    isCardFlipping = false;
    isCardFaceUp = false;
    
    // 如果有被翻开的卡片，将其翻转回去并清除文字
    if (selectedCard) {
        selectedCard.rotation.x = Math.PI / 2; // 重新面朝下
        updateSpecificCardText(selectedCard, "", "机会卡\nChance");
        selectedCard = null;
    }
    
    // 计算结果对应需要旋转到的目标欧拉角
    targetQuaternion1.setFromEuler(getDiceEuler(rollResult1));
    targetQuaternion2.setFromEuler(getDiceEuler(rollResult2));
    
    // 随机附加一个Y轴的世界旋转（0, 90, 180, 270度），显得停下的姿态更自然
    const yQuat1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.floor(Math.random() * 4) * (Math.PI / 2));
    const yQuat2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.floor(Math.random() * 4) * (Math.PI / 2));
    
    targetQuaternion1.premultiply(yQuat1);
    targetQuaternion2.premultiply(yQuat2);
});

// --- 5.6 添加机会卡片牌堆 ---
const cardDeckGroup = new THREE.Group();
const cards = [];
const cardWidth = 4;
const cardHeight = 6;
const cardGeo = new THREE.PlaneGeometry(cardWidth, cardHeight);
const cardFrontMat = new THREE.MeshStandardMaterial({ color: 0xffd700, side: THREE.FrontSide });
const cardBackMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff, side: THREE.FrontSide });

for (let i = 0; i < 20; i++) {
    const singleCardGroup = new THREE.Group();
    
    const cardFront = new THREE.Mesh(cardGeo, cardFrontMat);
    cardFront.position.z = 0.01;
    
    const cardBack = new THREE.Mesh(cardGeo, cardBackMat);
    cardBack.rotation.y = Math.PI;
    cardBack.position.z = -0.01;
    
    singleCardGroup.add(cardFront);
    singleCardGroup.add(cardBack);
    
    // 排列成 5x4 的网格
    const row = Math.floor(i / 5);
    const col = i % 5;
    // 居中偏移
    singleCardGroup.position.set((col - 2) * 5, 0, (row - 1.5) * 7);
    
    // 初始面朝下 (Front 朝 -Y)
    singleCardGroup.rotation.x = Math.PI / 2; 
    
    singleCardGroup.userData = { isCard: true, id: i };
    cards.push(singleCardGroup);
    cardDeckGroup.add(singleCardGroup);
}

// 放在棋盘中心稍微偏上
cardDeckGroup.position.set(0, 3.1, 0); 
scene.add(cardDeckGroup);

// 如果字体已经加载完，立即初始化背面文字
if (typeof globalFont !== 'undefined' && globalFont) {
    cards.forEach(c => updateSpecificCardText(c, "", "机会卡\nChance"));
}

function updateSpecificCardText(cardGroupObj, frontTextStr, backTextStr) {
    if (!globalFont) return;
    const cardFront = cardGroupObj.children[0];
    const cardBack = cardGroupObj.children[1];
    
    // 清除旧文字
    const toRemoveFront = [];
    cardFront.children.forEach(c => { if(c.geometry instanceof TextGeometry) toRemoveFront.push(c); });
    toRemoveFront.forEach(c => {
        c.geometry.dispose();
        c.material.dispose();
        cardFront.remove(c);
    });
    
    const toRemoveBack = [];
    cardBack.children.forEach(c => { if(c.geometry instanceof TextGeometry) toRemoveBack.push(c); });
    toRemoveBack.forEach(c => {
        c.geometry.dispose();
        c.material.dispose();
        cardBack.remove(c);
    });

    // 背面文字
    if (backTextStr) {
        const backTextGeo = new TextGeometry(backTextStr, { font: globalFont, size: 0.6, height: 0.1 });
        backTextGeo.computeBoundingBox();
        const bx = -0.5 * (backTextGeo.boundingBox.max.x - backTextGeo.boundingBox.min.x);
        const by = -0.5 * (backTextGeo.boundingBox.max.y - backTextGeo.boundingBox.min.y);
        const cardBackTextMesh = new THREE.Mesh(backTextGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        cardBackTextMesh.position.set(bx, by, 0.1);
        cardBack.add(cardBackTextMesh);
    }

    // 正面文字
    if (frontTextStr) {
        const frontTextGeo = new TextGeometry(frontTextStr, { font: globalFont, size: 0.4, height: 0.05 });
        frontTextGeo.computeBoundingBox();
        const fx = -0.5 * (frontTextGeo.boundingBox.max.x - frontTextGeo.boundingBox.min.x);
        const fy = -0.5 * (frontTextGeo.boundingBox.max.y - frontTextGeo.boundingBox.min.y);
        const cardFrontTextMesh = new THREE.Mesh(frontTextGeo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
        cardFrontTextMesh.position.set(fx, fy, 0.1);
        cardFront.add(cardFrontTextMesh);
    }
}

// 卡片动画状态
let isWaitingForCardPick = false;
let selectedCard = null;
let isCardFlipping = false;
let isCardFaceUp = false; // true表示正面朝上，false表示反面(深蓝色)朝上
let cardFlipStartTime = 0;
const cardFlipDuration = 600; // 翻转动画持续时间
let cardStartRotationX = 0;
let cardTargetRotationX = 0;

// --- 5.7 射线检测(Raycaster)用于点击卡片 ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    // 归一化设备坐标 (-1 到 +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 通过摄像机和鼠标位置更新射线
    raycaster.setFromCamera(mouse, camera);

    // 计算物体和射线的交点
    if (isWaitingForCardPick && !isCardFlipping) {
        // 查找所有卡片组中的网格
        const intersects = raycaster.intersectObjects(cardDeckGroup.children, true);

        if (intersects.length > 0) {
            // 找到被点击的卡片组
            let clickedCard = intersects[0].object.parent;
            if (clickedCard && clickedCard.userData.isCard) {
                isWaitingForCardPick = false;
                isCardFlipping = true;
                selectedCard = clickedCard;
                cardFlipStartTime = performance.now();
                cardStartRotationX = selectedCard.rotation.x;
                // 从面朝下 (Math.PI/2) 翻转到面朝上 (-Math.PI/2)
                cardTargetRotationX = -Math.PI / 2; 
                isCardFaceUp = true;
                
                // 随机抽取卡片效果
                const chanceEffects = [
                    { type: 'money', msg: "天降横财\n+1000!", amt: 1000 },
                    { type: 'go_start', msg: "回到起点\n+2000!" },
                    { type: 'pause', msg: "暂停行动\n停赛 2 回合", turns: 2 }
                ];
                pendingCardEffect = chanceEffects[Math.floor(Math.random() * chanceEffects.length)];
                
                // 更新该卡片的文字
                updateSpecificCardText(selectedCard, pendingCardEffect.msg, "机会卡\nChance");
            }
        }
    }
});


// 6. 添加轨道控制器（允许用户旋转、平移、缩放，提升体验）
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 阻尼感
controls.maxPolarAngle = Math.PI / 2 - 0.05; // 限制视角不能钻到桌子底下
controls.panSpeed = 2.0; // 提高平移速度，默认是1.0

// 7. 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 更新控制器阻尼
    controls.update();
    
    // 骰子动画逻辑
    if (isRolling) {
        const now = performance.now();
        const elapsed = now - rollStartTime;
        
        if (elapsed < 1000) {
            // 阶段1：快速随机旋转 + 抛起 (0 ~ 1秒)
            dice1.rotation.x += 0.3;
            dice1.rotation.y += 0.4;
            dice1.rotation.z += 0.5;
            dice2.rotation.x += 0.4;
            dice2.rotation.y += 0.5;
            dice2.rotation.z += 0.3;
            
            // 抛物线高度：最高点在0.5秒处
            const jumpY = Math.sin((elapsed / 1000) * Math.PI) * 4;
            dice1.position.y = 1 + jumpY;
            dice2.position.y = 1 + jumpY;
        } else if (elapsed < 2000) {
            // 阶段2：平滑过渡到目标旋转并落下 (1 ~ 2秒)
            if (!slerpStarted) {
                startQuaternion1.copy(dice1.quaternion);
                startQuaternion2.copy(dice2.quaternion);
                slerpStarted = true;
            }
            
            const progress = (elapsed - 1000) / 1000;
            // easeOutQuad 缓动：先快后慢
            const easeOut = 1 - (1 - progress) * (1 - progress);
            
            // 四元数球面线性插值，平滑转到目标角度
            dice1.quaternion.slerpQuaternions(startQuaternion1, targetQuaternion1, easeOut);
            dice2.quaternion.slerpQuaternions(startQuaternion2, targetQuaternion2, easeOut);
            
            // 落下回到 y=1
            const dropY = 1 + (1 - easeOut) * 0.5;
            dice1.position.y = dropY;
            dice2.position.y = dropY;
        } else {
            // 动画结束，对齐最终状态
            isRolling = false;
            dice1.quaternion.copy(targetQuaternion1);
            dice2.quaternion.copy(targetQuaternion2);
            dice1.position.y = 1;
            dice2.position.y = 1;
            
            // 显示结果文字
            const resultEl = document.getElementById('resultText');
            resultEl.innerText = `点数: ${rollTotal} (${rollResult1} + ${rollResult2})`;
            resultEl.style.display = 'block';

            console.log(`[游戏状态] 掷出点数: ${rollTotal} (${rollResult1} + ${rollResult2})`);

            // 触发当前回合玩家移动
            if (!isPlayerMoving) {
                const currentPlayer = players[currentPlayerTurn];
                playerTargetIndex = (currentPlayer.currentIndex + rollTotal) % pathPositions.length;
                console.log(`[游戏状态] 玩家 ${currentPlayer.id} 开始移动，目标格子: ${playerTargetIndex}`);

                isPlayerMoving = true;
                playerMoveProgress = 0;
                
                // 准备第一步移动
                const nextIndex = (currentPlayer.currentIndex + 1) % pathPositions.length;
                movingFromVec.copy(pathPositions[currentPlayer.currentIndex]);
                movingToVec.copy(pathPositions[nextIndex]);
            }
        }
    }
    
    // 玩家移动动画逻辑
    if (isPlayerMoving) {
        const currentPlayer = players[currentPlayerTurn];
        // 移动速度（调整增加每次渲染步进值以改变速度）
        playerMoveProgress += 0.05; 
        
        if (playerMoveProgress >= 1) {
            // 一步走完
            currentPlayer.currentIndex = (currentPlayer.currentIndex + 1) % pathPositions.length;
            playerMoveProgress = 0;
            
            // 如果经过了起点 (index 0) 并且还没到达终点（如果刚好到达起点，则由 onPlayerLand 触发奖励）
            if (currentPlayer.currentIndex === 0 && currentPlayer.currentIndex !== playerTargetIndex) {
                currentPlayer.money += 2000;
                console.log(`[事件] 玩家 ${currentPlayer.id} 经过起点，获得 2000 金币！`);
                updateStatusUI();
            }

            if (currentPlayer.currentIndex === playerTargetIndex) {
                // 已经到达目标格子，停止移动
                isPlayerMoving = false;
                updateAllPlayersPosition();
                
                // 触发落地逻辑
                onPlayerLand(currentPlayer, boardCells[currentPlayer.currentIndex]);

            } else {
                // 继续走向下一个格子
                const nextIndex = (currentPlayer.currentIndex + 1) % pathPositions.length;
                movingFromVec.copy(pathPositions[currentPlayer.currentIndex]);
                movingToVec.copy(pathPositions[nextIndex]);
            }
        } else {
            // 正在一步中间，进行插值，并加入一个跳跃的抛物线效果
            const x = THREE.MathUtils.lerp(movingFromVec.x, movingToVec.x, playerMoveProgress);
            const z = THREE.MathUtils.lerp(movingFromVec.z, movingToVec.z, playerMoveProgress);
            // 基础Y高度 + 跳跃高度
            const jumpHeight = Math.sin(playerMoveProgress * Math.PI) * 1.5; 
            const y = movingFromVec.y + jumpHeight; 
            
            currentPlayer.group.position.set(x + currentPlayer.offset.x, y, z + currentPlayer.offset.z);
            
            // 移动时面朝下一个格子的方向
            currentPlayer.group.lookAt(movingToVec.x + currentPlayer.offset.x, currentPlayer.group.position.y, movingToVec.z + currentPlayer.offset.z);

            // 简单的摆手/摆腿动画 (正弦波模拟走路)
            const walkCycle = Math.sin(playerMoveProgress * Math.PI * 4); // 乘以4是为了让一步中摆动两次
            const parts = currentPlayer.group.userData;
            parts.leftArm.rotation.x = walkCycle * 0.5;
            parts.rightArm.rotation.x = -walkCycle * 0.5;
            parts.leftLeg.rotation.x = -walkCycle * 0.5;
            parts.rightLeg.rotation.x = walkCycle * 0.5;
        }
    } else {
        // 如果没有移动，确保肢体恢复垂直
        players.forEach(p => {
            const parts = p.group.userData;
            if (parts.leftArm.rotation.x !== 0) {
                parts.leftArm.rotation.x = THREE.MathUtils.lerp(parts.leftArm.rotation.x, 0, 0.1);
                parts.rightArm.rotation.x = THREE.MathUtils.lerp(parts.rightArm.rotation.x, 0, 0.1);
                parts.leftLeg.rotation.x = THREE.MathUtils.lerp(parts.leftLeg.rotation.x, 0, 0.1);
                parts.rightLeg.rotation.x = THREE.MathUtils.lerp(parts.rightLeg.rotation.x, 0, 0.1);
            }
        });
    }
    
    // 卡片翻转动画逻辑
    if (isCardFlipping && selectedCard) {
        const now = performance.now();
        const elapsed = now - cardFlipStartTime;
        let progress = elapsed / cardFlipDuration; // 0 到 1
        
        if (progress >= 1) {
            progress = 1;
            isCardFlipping = false; // 动画结束
            
            // 如果翻到了正面，触发卡片效果
            if (isCardFaceUp) {
                const player = players[currentPlayerTurn];
                const eventEl = document.getElementById('eventText');
                
                // 使用之前随机好的效果
                const effect = pendingCardEffect;
                if (!effect) return; // 防御性检查
                
                eventEl.innerText = `🃏 卡片效果: ${effect.msg.replace('\n', ' ')}`;
                console.log(`[事件] ${eventEl.innerText}`);
                
                if (effect.type === 'money') {
                    player.money += effect.amt;
                    updateUI();
                    // 2秒后结束回合
                    setTimeout(() => {
                        endTurn();
                    }, 2000);
                } else if (effect.type === 'go_start') {
                    // 回到起点并得2000
                    setTimeout(() => {
                        console.log(`[游戏状态] ${player.name} 根据卡片效果回到起点`);
                        
                        // 瞬移到起点
                        player.currentIndex = 0;
                        updateAllPlayersPosition();
                        
                        // 触发起点逻辑（里面会加2000金币并结束回合）
                        onPlayerLand(player, boardCells[0]);
                    }, 1500);
                } else if (effect.type === 'pause') {
                    // 暂停回合
                    player.jailTurns = effect.turns; // 复用 jailTurns 逻辑来实现停赛
                    setTimeout(() => {
                        endTurn();
                    }, 2000);
                }
                
                pendingCardEffect = null; // 效果执行完毕，清空
            }
        }
        
        // 使用 easeInOutSine 缓动函数让翻牌看起来更平滑自然
        const easeProgress = -(Math.cos(Math.PI * progress) - 1) / 2;
        
        // 线性插值计算当前的 X 轴旋转角度 (翻转卡片)
        selectedCard.rotation.x = THREE.MathUtils.lerp(cardStartRotationX, cardTargetRotationX, easeProgress);
        
        // 稍微提升一点 Y 轴高度以突出选中的卡片
        // 基础高度是 0，当翻转一半时达到最高点
        const jumpY = Math.sin(progress * Math.PI) * 2;
        selectedCard.position.y = jumpY;
    }
    
    // 渲染场景
    renderer.render(scene, camera);
}
animate();

// 8. 响应窗口大小调整
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
