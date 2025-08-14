// 自然艺术二维码生成器 - 基于ControlNet思路
class QRNaturalArtGenerator {
    constructor() {
        this.qrMatrix = null;
        this.selectedStyle = null;
        this.settings = {
            controlStrength: 0.7,
            denoisingStrength: 0.4,
            detailLevel: 'medium',
            blendMode: 'natural'
        };
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 文件上传
        document.getElementById('qrInput').addEventListener('change', (e) => this.handleQRUpload(e));
        document.getElementById('qrUploadArea').addEventListener('click', () => {
            document.getElementById('qrInput').click();
        });

        // 拖拽上传
        this.setupDragAndDrop();

        // 风格选择
        document.querySelectorAll('.natural-style').forEach(style => {
            style.addEventListener('click', () => this.selectStyle(style));
        });

        // 参数控制
        this.setupParameterControls();

        // 生成和下载按钮
        document.getElementById('generateBtn').addEventListener('click', () => this.generateNaturalArt());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadResult());
    }

    setupDragAndDrop() {
        const area = document.getElementById('qrUploadArea');
        const input = document.getElementById('qrInput');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            area.addEventListener(eventName, () => {
                area.style.background = 'linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%)';
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, () => {
                area.style.background = '';
            });
        });

        area.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                input.files = files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    setupParameterControls() {
        // 控制强度
        const controlStrength = document.getElementById('controlStrength');
        const controlStrengthValue = document.getElementById('controlStrengthValue');
        controlStrength.addEventListener('input', (e) => {
            this.settings.controlStrength = parseFloat(e.target.value);
            const descriptions = {
                '0.4': '0.4 - 高度艺术化',
                '0.5': '0.5 - 艺术优先',
                '0.6': '0.6 - 艺术倾向',
                '0.7': '0.7 - 平衡艺术与可读性',
                '0.8': '0.8 - 可读性倾向',
                '0.9': '0.9 - 高可读性'
            };
            controlStrengthValue.textContent = descriptions[e.target.value] || e.target.value;
        });

        // 艺术化程度
        const denoisingStrength = document.getElementById('denoisingStrength');
        const denoisingStrengthValue = document.getElementById('denoisingStrengthValue');
        denoisingStrength.addEventListener('input', (e) => {
            this.settings.denoisingStrength = parseFloat(e.target.value);
            const descriptions = {
                '0.2': '0.2 - 轻微艺术化',
                '0.3': '0.3 - 低度艺术化',
                '0.4': '0.4 - 中等艺术化',
                '0.5': '0.5 - 高度艺术化',
                '0.6': '0.6 - 极度艺术化'
            };
            denoisingStrengthValue.textContent = descriptions[e.target.value] || e.target.value;
        });

        // 细节层次和融合模式
        document.getElementById('detailLevel').addEventListener('change', (e) => {
            this.settings.detailLevel = e.target.value;
        });

        document.getElementById('blendMode').addEventListener('change', (e) => {
            this.settings.blendMode = e.target.value;
        });
    }

    async handleQRUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            this.showProgress('正在解析二维码...', 10);
            
            const image = await this.loadImage(file);
            const matrix = await this.parseQRMatrix(image);
            
            this.qrMatrix = matrix;
            this.displayPreview(image);
            this.showCanvasRow();
            this.showStyleSection();
            
            this.hideProgress();
            
        } catch (error) {
            console.error('二维码解析失败:', error);
            alert('二维码解析失败，请确保上传的是清晰的二维码图片');
            this.hideProgress();
        }
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async parseQRMatrix(image) {
        // 使用改进的二维码解析算法
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 标准化图像尺寸
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        
        // 绘制并获取图像数据
        ctx.drawImage(image, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        
        // 转换为灰度并应用自适应阈值
        const processedData = this.preprocessImage(imageData, size);
        
        // 检测二维码区域和模块网格
        const qrInfo = this.detectQRStructure(processedData, size);
        
        // 提取二维码矩阵
        const matrix = this.extractMatrix(processedData, qrInfo);
        
        return {
            matrix: matrix,
            size: matrix.length,
            moduleSize: qrInfo.moduleSize,
            bounds: qrInfo.bounds,
            originalSize: { width: image.width, height: image.height }
        };
    }

    preprocessImage(imageData, size) {
        const { data } = imageData;
        const grayData = new Array(size * size);
        
        // 转换为灰度
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            grayData[pixelIndex] = 0.299 * r + 0.587 * g + 0.114 * b;
        }
        
        // 应用高斯模糊减少噪声
        const blurredData = this.applyGaussianBlur(grayData, size, 1.0);
        
        // 自适应阈值二值化
        const threshold = this.calculateOtsuThreshold(blurredData);
        const binaryData = blurredData.map(value => value < threshold ? 1 : 0);
        
        return { gray: blurredData, binary: binaryData, threshold };
    }

    applyGaussianBlur(data, size, sigma) {
        const kernel = this.createGaussianKernel(sigma);
        const kernelSize = kernel.length;
        const halfKernel = Math.floor(kernelSize / 2);
        const blurred = new Array(size * size);
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let sum = 0;
                let weightSum = 0;
                
                for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                    for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                        const px = Math.max(0, Math.min(size - 1, x + kx));
                        const py = Math.max(0, Math.min(size - 1, y + ky));
                        const weight = kernel[ky + halfKernel][kx + halfKernel];
                        
                        sum += data[py * size + px] * weight;
                        weightSum += weight;
                    }
                }
                
                blurred[y * size + x] = sum / weightSum;
            }
        }
        
        return blurred;
    }

    createGaussianKernel(sigma) {
        const size = Math.ceil(sigma * 6) | 1; // 确保是奇数
        const kernel = [];
        const center = Math.floor(size / 2);
        let sum = 0;
        
        for (let y = 0; y < size; y++) {
            kernel[y] = [];
            for (let x = 0; x < size; x++) {
                const distance = Math.pow(x - center, 2) + Math.pow(y - center, 2);
                const value = Math.exp(-distance / (2 * sigma * sigma));
                kernel[y][x] = value;
                sum += value;
            }
        }
        
        // 归一化
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                kernel[y][x] /= sum;
            }
        }
        
        return kernel;
    }

    calculateOtsuThreshold(data) {
        // Otsu算法计算最佳阈值
        const histogram = new Array(256).fill(0);
        data.forEach(value => {
            const index = Math.max(0, Math.min(255, Math.floor(value)));
            histogram[index]++;
        });
        
        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }
        
        let sumB = 0;
        let wB = 0;
        let maximum = 0;
        let threshold = 0;
        
        for (let t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB === 0) continue;
            
            const wF = data.length - wB;
            if (wF === 0) break;
            
            sumB += t * histogram[t];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            const between = wB * wF * Math.pow(mB - mF, 2);
            
            if (between > maximum) {
                maximum = between;
                threshold = t;
            }
        }
        
        return threshold;
    }

    detectQRStructure(processedData, size) {
        const { binary } = processedData;
        
        // 寻找定位点模式
        const finderPatterns = this.findFinderPatterns(binary, size);
        
        if (finderPatterns.length < 3) {
            throw new Error('无法检测到足够的定位点');
        }
        
        // 计算模块大小
        const moduleSize = this.calculateModuleSize(finderPatterns, size);
        
        // 估算二维码尺寸
        const qrSize = Math.round(size / moduleSize);
        
        return {
            finderPatterns,
            moduleSize,
            qrSize,
            bounds: { x: 0, y: 0, width: size, height: size }
        };
    }

    findFinderPatterns(binary, size) {
        const patterns = [];
        const patternSize = 7; // 定位点标准尺寸
        
        for (let y = patternSize; y < size - patternSize; y += 3) {
            for (let x = patternSize; x < size - patternSize; x += 3) {
                if (this.isFinderPattern(binary, x, y, size, patternSize)) {
                    patterns.push({ x, y, size: patternSize });
                }
            }
        }
        
        // 去重和筛选
        return this.filterFinderPatterns(patterns);
    }

    isFinderPattern(binary, centerX, centerY, imageSize, patternSize) {
        const halfSize = Math.floor(patternSize / 2);
        let blackCount = 0;
        let totalCount = 0;
        
        for (let dy = -halfSize; dy <= halfSize; dy++) {
            for (let dx = -halfSize; dx <= halfSize; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (x >= 0 && x < imageSize && y >= 0 && y < imageSize) {
                    const index = y * imageSize + x;
                    if (binary[index] === 1) blackCount++;
                    totalCount++;
                }
            }
        }
        
        const blackRatio = blackCount / totalCount;
        return blackRatio > 0.4 && blackRatio < 0.6;
    }

    filterFinderPatterns(patterns) {
        // 按位置筛选出最可能的3个定位点
        if (patterns.length <= 3) return patterns;
        
        // 简化处理：选择距离较远的3个点
        const filtered = [];
        for (let i = 0; i < patterns.length && filtered.length < 3; i++) {
            const pattern = patterns[i];
            let tooClose = false;
            
            for (const existing of filtered) {
                const distance = Math.sqrt(
                    Math.pow(pattern.x - existing.x, 2) + 
                    Math.pow(pattern.y - existing.y, 2)
                );
                if (distance < 50) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                filtered.push(pattern);
            }
        }
        
        return filtered;
    }

    calculateModuleSize(finderPatterns, size) {
        if (finderPatterns.length < 2) return 8;
        
        // 计算定位点之间的距离
        const distances = [];
        for (let i = 0; i < finderPatterns.length - 1; i++) {
            for (let j = i + 1; j < finderPatterns.length; j++) {
                const p1 = finderPatterns[i];
                const p2 = finderPatterns[j];
                const distance = Math.sqrt(
                    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
                );
                distances.push(distance);
            }
        }
        
        // 使用平均距离估算模块大小
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        return Math.max(4, Math.round(avgDistance / 14)); // 14是定位点间的标准模块数
    }

    extractMatrix(processedData, qrInfo) {
        const { binary } = processedData;
        const { qrSize, moduleSize } = qrInfo;
        const matrix = [];
        
        for (let row = 0; row < qrSize; row++) {
            matrix[row] = [];
            for (let col = 0; col < qrSize; col++) {
                // 计算模块中心点
                const centerX = Math.round(col * moduleSize + moduleSize / 2);
                const centerY = Math.round(row * moduleSize + moduleSize / 2);
                
                // 采样模块区域
                let blackCount = 0;
                let totalCount = 0;
                const sampleSize = Math.max(1, Math.floor(moduleSize / 3));
                
                for (let dy = -sampleSize; dy <= sampleSize; dy++) {
                    for (let dx = -sampleSize; dx <= sampleSize; dx++) {
                        const x = centerX + dx;
                        const y = centerY + dy;
                        
                        if (x >= 0 && x < 512 && y >= 0 && y < 512) {
                            const index = y * 512 + x;
                            if (binary[index] === 1) blackCount++;
                            totalCount++;
                        }
                    }
                }
                
                matrix[row][col] = (blackCount / totalCount) > 0.5 ? 1 : 0;
            }
        }
        
        return matrix;
    }

    displayPreview(image) {
        const canvas = document.getElementById('preview-canvas');
        const ctx = canvas.getContext('2d');
        
        const maxSize = 300;
        const scale = Math.min(maxSize / image.width, maxSize / image.height);
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;
        
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    showCanvasRow() {
        document.getElementById('canvasRow').style.display = 'grid';
    }

    showStyleSection() {
        document.getElementById('styleSection').style.display = 'block';
    }

    selectStyle(styleElement) {
        document.querySelectorAll('.natural-style').forEach(style => {
            style.classList.remove('selected');
        });
        
        styleElement.classList.add('selected');
        this.selectedStyle = styleElement.dataset.style;
        
        document.getElementById('generateBtn').disabled = false;
    }

    async generateNaturalArt() {
        if (!this.qrMatrix || !this.selectedStyle) {
            alert('请先上传二维码并选择风格');
            return;
        }

        this.showProgress('正在生成自然艺术二维码...', 0);
        
        try {
            // 分阶段生成
            await this.generateWithStages();
        } catch (error) {
            console.error('生成失败:', error);
            alert('生成失败，请重试');
            this.hideProgress();
        }
    }

    async generateWithStages() {
        const canvas = document.getElementById('result-canvas');
        const ctx = canvas.getContext('2d');
        
        const outputSize = 600;
        canvas.width = outputSize;
        canvas.height = outputSize;
        
        // 阶段1: 基础背景
        this.showProgress('生成基础背景...', 20);
        await this.delay(300);
        this.generateBackground(ctx, outputSize);
        
        // 阶段2: 智能元素映射
        this.showProgress('智能元素映射...', 40);
        await this.delay(300);
        this.mapQRToElements(ctx, outputSize);
        
        // 阶段3: 自然融合处理
        this.showProgress('自然融合处理...', 60);
        await this.delay(300);
        this.applyNaturalBlending(ctx, outputSize);
        
        // 阶段4: 光影效果
        this.showProgress('添加光影效果...', 80);
        await this.delay(300);
        this.addLightingEffects(ctx, outputSize);
        
        // 阶段5: 最终优化
        this.showProgress('最终优化...', 95);
        await this.delay(300);
        this.finalizeArtwork(ctx, outputSize);
        
        this.showProgress('生成完成！', 100);
        await this.delay(500);
        
        this.hideProgress();
        document.getElementById('downloadBtn').style.display = 'inline-block';
    }

    generateBackground(ctx, size) {
        // 根据风格生成基础背景
        const gradient = this.createBackgroundGradient(ctx, size);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // 添加基础纹理
        this.addBaseTexture(ctx, size);
    }

    createBackgroundGradient(ctx, size) {
        const gradients = {
            'winter-village': () => {
                const gradient = ctx.createLinearGradient(0, 0, 0, size);
                gradient.addColorStop(0, '#87CEEB');  // 天蓝色
                gradient.addColorStop(0.3, '#B0E0E6'); // 浅蓝色
                gradient.addColorStop(0.7, '#F0F8FF'); // 爱丽丝蓝
                gradient.addColorStop(1, '#FFFFFF');   // 白色
                return gradient;
            },
            'forest-cabin': () => {
                const gradient = ctx.createLinearGradient(0, 0, 0, size);
                gradient.addColorStop(0, '#228B22');  // 森林绿
                gradient.addColorStop(0.4, '#32CD32'); // 酸橙绿
                gradient.addColorStop(0.8, '#90EE90'); // 浅绿色
                gradient.addColorStop(1, '#F0FFF0');   // 蜜瓜色
                return gradient;
            },
            'japanese-garden': () => {
                const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
                gradient.addColorStop(0, '#FFE4E1');  // 雾玫瑰色
                gradient.addColorStop(0.5, '#F5F5DC'); // 米色
                gradient.addColorStop(1, '#D2B48C');   // 棕褐色
                return gradient;
            },
            'city-night': () => {
                const gradient = ctx.createLinearGradient(0, 0, 0, size);
                gradient.addColorStop(0, '#191970');  // 深蓝色
                gradient.addColorStop(0.3, '#2F4F4F'); // 暗灰色
                gradient.addColorStop(0.7, '#4682B4'); // 钢蓝色
                gradient.addColorStop(1, '#1E1E1E');   // 深灰色
                return gradient;
            }
        };
        
        return gradients[this.selectedStyle]() || gradients['winter-village']();
    }

    addBaseTexture(ctx, size) {
        // 添加微妙的噪声纹理
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 10;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    mapQRToElements(ctx, size) {
        const { matrix } = this.qrMatrix;
        const matrixSize = matrix.length;
        const moduleSize = size / matrixSize;
        
        // 根据风格映射元素
        const elementMapper = this.getElementMapper();
        
        for (let row = 0; row < matrixSize; row++) {
            for (let col = 0; col < matrixSize; col++) {
                const x = col * moduleSize;
                const y = row * moduleSize;
                const isBlack = matrix[row][col] === 1;
                
                // 获取周围模块信息用于上下文感知
                const context = this.getModuleContext(matrix, row, col, matrixSize);
                
                // 映射到自然元素
                elementMapper(ctx, x, y, moduleSize, isBlack, context);
            }
        }
    }

    getElementMapper() {
        const mappers = {
            'winter-village': (ctx, x, y, size, isBlack, context) => {
                if (isBlack) {
                    this.drawNaturalHouse(ctx, x, y, size, context);
                } else {
                    this.drawNaturalSnow(ctx, x, y, size, context);
                }
            },
            'forest-cabin': (ctx, x, y, size, isBlack, context) => {
                if (isBlack) {
                    this.drawNaturalTree(ctx, x, y, size, context);
                } else {
                    this.drawNaturalClearing(ctx, x, y, size, context);
                }
            },
            'japanese-garden': (ctx, x, y, size, isBlack, context) => {
                if (isBlack) {
                    this.drawNaturalBuilding(ctx, x, y, size, context);
                } else {
                    this.drawNaturalPath(ctx, x, y, size, context);
                }
            },
            'city-night': (ctx, x, y, size, isBlack, context) => {
                if (isBlack) {
                    this.drawNaturalSkyscraper(ctx, x, y, size, context);
                } else {
                    this.drawNaturalSky(ctx, x, y, size, context);
                }
            }
        };
        
        return mappers[this.selectedStyle] || mappers['winter-village'];
    }

    getModuleContext(matrix, row, col, size) {
        // 获取周围8个模块的状态
        const context = {
            neighbors: [],
            clusterSize: 0,
            isEdge: false,
            isCorner: false
        };
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const newRow = row + dy;
                const newCol = col + dx;
                
                if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
                    context.neighbors.push(matrix[newRow][newCol]);
                }
            }
        }
        
        // 计算聚集大小
        context.clusterSize = context.neighbors.filter(n => n === matrix[row][col]).length;
        
        // 检测边缘和角落
        context.isEdge = row === 0 || row === size - 1 || col === 0 || col === size - 1;
        context.isCorner = (row === 0 || row === size - 1) && (col === 0 || col === size - 1);
        
        return context;
    }

    // 自然元素绘制函数 - 雪景村庄
    drawNaturalHouse(ctx, x, y, size, context) {
        const houseTypes = ['cabin', 'cottage', 'chalet'];
        const type = houseTypes[Math.floor((x + y) / size) % houseTypes.length];
        
        ctx.save();
        
        // 根据聚集大小调整房屋大小
        const scale = 0.8 + (context.clusterSize / 8) * 0.4;
        const houseSize = size * scale;
        const offsetX = (size - houseSize) / 2;
        const offsetY = (size - houseSize) / 2;
        
        // 房屋主体
        ctx.fillStyle = this.getHouseColor(type, context);
        this.drawHouseShape(ctx, x + offsetX, y + offsetY, houseSize, type);
        
        // 添加窗户光效
        if (houseSize > 8) {
            this.addWindowGlow(ctx, x + offsetX, y + offsetY, houseSize);
        }
        
        ctx.restore();
    }

    drawNaturalSnow(ctx, x, y, size, context) {
        ctx.save();
        
        // 基础雪地颜色
        const snowShades = ['#FFFFFF', '#F8F8FF', '#F0F8FF', '#E6E6FA'];
        const baseColor = snowShades[Math.floor((x + y) / size) % snowShades.length];
        
        // 创建渐变效果
        const gradient = ctx.createRadialGradient(
            x + size/2, y + size/2, 0,
            x + size/2, y + size/2, size/2
        );
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, this.adjustBrightness(baseColor, -0.1));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // 添加雪花细节
        this.addSnowflakeDetails(ctx, x, y, size, context);
        
        ctx.restore();
    }

    // 自然元素绘制函数 - 森林木屋
    drawNaturalTree(ctx, x, y, size, context) {
        ctx.save();
        
        const treeTypes = ['pine', 'oak', 'birch'];
        const type = treeTypes[Math.floor((x + y) / size) % treeTypes.length];
        
        // 根据上下文调整树的大小和形状
        const scale = 0.7 + (context.clusterSize / 8) * 0.5;
        const treeSize = size * scale;
        const offsetX = (size - treeSize) / 2;
        const offsetY = (size - treeSize) / 2;
        
        this.drawTreeShape(ctx, x + offsetX, y + offsetY, treeSize, type, context);
        
        ctx.restore();
    }

    drawNaturalClearing(ctx, x, y, size, context) {
        ctx.save();
        
        // 森林空地的多种颜色
        const clearingColors = ['#90EE90', '#98FB98', '#F0FFF0', '#ADFF2F'];
        const baseColor = clearingColors[Math.floor((x + y) / size) % clearingColors.length];
        
        // 创建自然的颜色变化
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, this.adjustBrightness(baseColor, -0.15));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // 添加草地纹理
        this.addGrassTexture(ctx, x, y, size, context);
        
        ctx.restore();
    }

    // 工具函数
    getHouseColor(type, context) {
        const colors = {
            cabin: '#8B4513',    // 鞍褐色
            cottage: '#A0522D',  // 赭色
            chalet: '#654321'    // 深褐色
        };
        
        let baseColor = colors[type] || colors.cabin;
        
        // 根据聚集情况调整颜色
        if (context.clusterSize > 5) {
            baseColor = this.adjustBrightness(baseColor, 0.1);
        }
        
        return baseColor;
    }

    drawHouseShape(ctx, x, y, size, type) {
        // 房屋主体
        ctx.fillRect(x, y + size * 0.3, size, size * 0.7);
        
        // 屋顶
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.3);
        ctx.lineTo(x + size / 2, y);
        ctx.lineTo(x + size, y + size * 0.3);
        ctx.closePath();
        ctx.fillStyle = this.adjustBrightness(ctx.fillStyle, -0.2);
        ctx.fill();
    }

    addWindowGlow(ctx, x, y, size) {
        const windowCount = Math.floor(size / 8);
        
        for (let i = 0; i < windowCount; i++) {
            const windowX = x + (i % 2) * size * 0.6 + size * 0.2;
            const windowY = y + Math.floor(i / 2) * size * 0.4 + size * 0.4;
            const windowSize = Math.max(2, size * 0.15);
            
            // 创建发光效果
            const gradient = ctx.createRadialGradient(
                windowX + windowSize/2, windowY + windowSize/2, 0,
                windowX + windowSize/2, windowY + windowSize/2, windowSize
            );
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.7, '#FFA500');
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(windowX - windowSize/2, windowY - windowSize/2, windowSize * 2, windowSize * 2);
            
            // 窗户本体
            ctx.fillStyle = '#FFEB3B';
            ctx.fillRect(windowX, windowY, windowSize, windowSize);
        }
    }

    addSnowflakeDetails(ctx, x, y, size, context) {
        if (size < 6) return;
        
        const flakeCount = Math.floor(size / 10) + 1;
        
        for (let i = 0; i < flakeCount; i++) {
            if (Math.random() < 0.3) {
                const flakeX = x + Math.random() * size;
                const flakeY = y + Math.random() * size;
                const flakeSize = Math.max(1, size * 0.1);
                
                ctx.fillStyle = '#E0E6E6';
                ctx.beginPath();
                ctx.arc(flakeX, flakeY, flakeSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawTreeShape(ctx, x, y, size, type, context) {
        // 树干
        const trunkWidth = Math.max(2, size * 0.2);
        const trunkHeight = size * 0.4;
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(
            x + (size - trunkWidth) / 2,
            y + size - trunkHeight,
            trunkWidth,
            trunkHeight
        );
        
        // 树冠
        const crownSize = size * 0.8;
        const crownY = y + size * 0.2;
        
        if (type === 'pine') {
            // 松树 - 三角形
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.moveTo(x + size / 2, y);
            ctx.lineTo(x + size * 0.1, crownY + crownSize * 0.6);
            ctx.lineTo(x + size * 0.9, crownY + crownSize * 0.6);
            ctx.closePath();
            ctx.fill();
        } else {
            // 其他树 - 圆形
            ctx.fillStyle = type === 'oak' ? '#32CD32' : '#90EE90';
            ctx.beginPath();
            ctx.arc(x + size / 2, crownY, crownSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    addGrassTexture(ctx, x, y, size, context) {
        if (size < 4) return;
        
        const grassCount = Math.floor(size / 3);
        
        for (let i = 0; i < grassCount; i++) {
            if (Math.random() < 0.4) {
                const grassX = x + Math.random() * size;
                const grassY = y + Math.random() * size;
                const grassHeight = Math.max(1, size * 0.3);
                
                ctx.strokeStyle = '#228B22';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(grassX, grassY);
                ctx.lineTo(grassX, grassY - grassHeight);
                ctx.stroke();
            }
        }
    }

    // 其他风格的绘制函数（简化版）
    drawNaturalBuilding(ctx, x, y, size, context) {
        // 日式建筑
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x, y + size * 0.4, size, size * 0.6);
        
        // 屋顶
        ctx.fillStyle = '#696969';
        ctx.fillRect(x - size * 0.1, y + size * 0.2, size * 1.2, size * 0.3);
    }

    drawNaturalPath(ctx, x, y, size, context) {
        // 石径
        const pathColors = ['#D2B48C', '#DEB887', '#F5DEB3'];
        ctx.fillStyle = pathColors[Math.floor((x + y) / size) % pathColors.length];
        ctx.fillRect(x, y, size, size);
    }

    drawNaturalSkyscraper(ctx, x, y, size, context) {
        // 摩天大楼
        ctx.fillStyle = '#2F4F4F';
        ctx.fillRect(x, y, size, size);
        
        // 窗户
        if (size > 6) {
            ctx.fillStyle = '#FFD700';
            const windowSize = Math.max(1, size * 0.2);
            ctx.fillRect(x + size * 0.7, y + size * 0.3, windowSize, windowSize);
        }
    }

    drawNaturalSky(ctx, x, y, size, context) {
        // 夜空
        const skyColors = ['#191970', '#1E1E1E', '#2F4F4F'];
        ctx.fillStyle = skyColors[Math.floor((x + y) / size) % skyColors.length];
        ctx.fillRect(x, y, size, size);
    }

    applyNaturalBlending(ctx, size) {
        // 应用自然融合效果
        const imageData = ctx.getImageData(0, 0, size, size);
        const blendedData = this.performNaturalBlending(imageData, size);
        ctx.putImageData(blendedData, 0, 0);
    }

    performNaturalBlending(imageData, size) {
        const data = imageData.data;
        const blendStrength = this.settings.denoisingStrength;
        
        // 应用轻微的高斯模糊来软化边缘
        const blurRadius = Math.floor(blendStrength * 3);
        
        if (blurRadius > 0) {
            return this.applyImageBlur(imageData, size, blurRadius);
        }
        
        return imageData;
    }

    applyImageBlur(imageData, size, radius) {
        const data = imageData.data;
        const output = new Uint8ClampedArray(data);
        
        for (let y = radius; y < size - radius; y++) {
            for (let x = radius; x < size - radius; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const pixelIndex = ((y + dy) * size + (x + dx)) * 4;
                        r += data[pixelIndex];
                        g += data[pixelIndex + 1];
                        b += data[pixelIndex + 2];
                        a += data[pixelIndex + 3];
                        count++;
                    }
                }
                
                const outputIndex = (y * size + x) * 4;
                output[outputIndex] = r / count;
                output[outputIndex + 1] = g / count;
                output[outputIndex + 2] = b / count;
                output[outputIndex + 3] = a / count;
            }
        }
        
        return new ImageData(output, size, size);
    }

    addLightingEffects(ctx, size) {
        // 添加全局光照效果
        const lightingGradient = this.createLightingGradient(ctx, size);
        
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = lightingGradient;
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
    }

    createLightingGradient(ctx, size) {
        const lightingEffects = {
            'winter-village': () => {
                const gradient = ctx.createRadialGradient(
                    size * 0.3, size * 0.3, 0,
                    size * 0.3, size * 0.3, size * 0.8
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(135, 206, 235, 0.1)');
                return gradient;
            },
            'forest-cabin': () => {
                const gradient = ctx.createLinearGradient(0, 0, size, size);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
                gradient.addColorStop(1, 'rgba(34, 139, 34, 0.1)');
                return gradient;
            },
            'japanese-garden': () => {
                const gradient = ctx.createRadialGradient(
                    size / 2, size / 2, 0,
                    size / 2, size / 2, size / 2
                );
                gradient.addColorStop(0, 'rgba(255, 228, 225, 0.2)');
                gradient.addColorStop(1, 'rgba(210, 180, 140, 0.1)');
                return gradient;
            },
            'city-night': () => {
                const gradient = ctx.createLinearGradient(0, 0, 0, size);
                gradient.addColorStop(0, 'rgba(25, 25, 112, 0.2)');
                gradient.addColorStop(1, 'rgba(30, 30, 30, 0.3)');
                return gradient;
            }
        };
        
        return lightingEffects[this.selectedStyle]() || lightingEffects['winter-village']();
    }

    finalizeArtwork(ctx, size) {
        // 最终优化：增强对比度以确保可扫描性
        const imageData = ctx.getImageData(0, 0, size, size);
        const enhancedData = this.enhanceContrast(imageData, this.settings.controlStrength);
        ctx.putImageData(enhancedData, 0, 0);
    }

    enhanceContrast(imageData, strength) {
        const data = imageData.data;
        const factor = strength * 2; // 0.8 - 1.8
        
        for (let i = 0; i < data.length; i += 4) {
            // 增强对比度
            data[i] = Math.max(0, Math.min(255, (data[i] - 128) * factor + 128));     // R
            data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * factor + 128)); // G
            data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * factor + 128)); // B
        }
        
        return imageData;
    }

    // 工具函数
    adjustBrightness(color, amount) {
        // 简化的亮度调整
        if (typeof color === 'string' && color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            const newR = Math.max(0, Math.min(255, r + amount * 255));
            const newG = Math.max(0, Math.min(255, g + amount * 255));
            const newB = Math.max(0, Math.min(255, b + amount * 255));
            
            return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
        }
        return color;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showProgress(text, progress) {
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('progressText').textContent = text;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }

    hideProgress() {
        document.getElementById('progressContainer').style.display = 'none';
    }

    downloadResult() {
        const canvas = document.getElementById('result-canvas');
        const link = document.createElement('a');
        link.download = `natural-art-qr-${this.selectedStyle}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new QRNaturalArtGenerator();
});
