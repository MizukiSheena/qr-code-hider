// 纯代码生成艺术二维码 - 保证可扫描性
class QRCodeArtGenerator {
    constructor() {
        this.qrMatrix = null;
        this.selectedStyle = null;
        this.settings = {
            moduleSize: 12,
            borderSize: 4,
            artIntensity: 'medium',
            colorScheme: 'winter'
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
        document.querySelectorAll('.art-option').forEach(option => {
            option.addEventListener('click', () => this.selectStyle(option));
        });

        // 控件监听
        document.getElementById('moduleSize').addEventListener('input', (e) => {
            this.settings.moduleSize = parseInt(e.target.value);
            document.getElementById('moduleSizeValue').textContent = `${e.target.value}px`;
        });

        document.getElementById('borderSize').addEventListener('input', (e) => {
            this.settings.borderSize = parseInt(e.target.value);
            document.getElementById('borderSizeValue').textContent = `${e.target.value} 模块`;
        });

        document.getElementById('artIntensity').addEventListener('change', (e) => {
            this.settings.artIntensity = e.target.value;
        });

        document.getElementById('colorScheme').addEventListener('change', (e) => {
            this.settings.colorScheme = e.target.value;
        });

        // 生成按钮
        document.getElementById('generateBtn').addEventListener('click', () => this.generateArtQR());
        document.getElementById('regenerateBtn').addEventListener('click', () => this.generateArtQR());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadResult());
    }

    setupDragAndDrop() {
        const area = document.getElementById('qrUploadArea');
        const input = document.getElementById('qrInput');
        
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.style.background = '#f0f8ff';
        });
        
        area.addEventListener('dragleave', () => {
            area.style.background = '';
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.style.background = '';
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                input.files = files;
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        });
    }

    async handleQRUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const image = await this.loadImage(file);
            const matrix = await this.parseQRMatrix(image);
            
            this.qrMatrix = matrix;
            this.displayPreview(image);
            this.showArtSection();
            
        } catch (error) {
            console.error('二维码解析失败:', error);
            alert('二维码解析失败，请确保上传的是清晰的二维码图片');
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
        // 创建Canvas进行图像处理
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 转换为灰度并二值化
        const grayData = this.convertToGrayscale(imageData);
        const threshold = this.calculateThreshold(grayData);
        const binaryMatrix = this.binarizeImage(grayData, canvas.width, canvas.height, threshold);
        
        // 检测二维码边界和模块大小
        const qrInfo = this.detectQRBounds(binaryMatrix, canvas.width, canvas.height);
        
        // 提取二维码矩阵
        const matrix = this.extractQRMatrix(binaryMatrix, qrInfo);
        
        return {
            matrix: matrix,
            size: matrix.length,
            moduleSize: qrInfo.moduleSize,
            bounds: qrInfo.bounds
        };
    }

    convertToGrayscale(imageData) {
        const { data, width, height } = imageData;
        const grayData = new Array(width * height);
        
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            grayData[pixelIndex] = 0.299 * r + 0.587 * g + 0.114 * b;
        }
        
        return grayData;
    }

    calculateThreshold(grayData) {
        // 使用简化的Otsu算法
        const histogram = new Array(256).fill(0);
        grayData.forEach(value => histogram[Math.floor(value)]++);
        
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
            
            const wF = grayData.length - wB;
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

    binarizeImage(grayData, width, height, threshold) {
        const matrix = [];
        for (let y = 0; y < height; y++) {
            matrix[y] = [];
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                matrix[y][x] = grayData[index] < threshold ? 1 : 0; // 1=黑, 0=白
            }
        }
        return matrix;
    }

    detectQRBounds(binaryMatrix, width, height) {
        // 简化的边界检测 - 寻找最大的矩形区域
        let minX = width, maxX = 0, minY = height, maxY = 0;
        let hasBlack = false;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (binaryMatrix[y][x] === 1) {
                    hasBlack = true;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        if (!hasBlack) {
            throw new Error('未检测到二维码内容');
        }
        
        const qrWidth = maxX - minX + 1;
        const qrHeight = maxY - minY + 1;
        const qrSize = Math.min(qrWidth, qrHeight);
        
        // 估算模块大小（假设是21x21或更大的标准二维码）
        const estimatedModules = Math.round(qrSize / 21); // 最小版本
        const moduleSize = Math.max(1, Math.round(qrSize / (21 + (estimatedModules - 1) * 4)));
        
        return {
            bounds: { minX, minY, maxX, maxY },
            moduleSize: moduleSize,
            estimatedSize: Math.round(qrSize / moduleSize)
        };
    }

    extractQRMatrix(binaryMatrix, qrInfo) {
        const { bounds, moduleSize, estimatedSize } = qrInfo;
        const matrix = [];
        
        for (let row = 0; row < estimatedSize; row++) {
            matrix[row] = [];
            for (let col = 0; col < estimatedSize; col++) {
                // 计算模块中心点
                const centerX = bounds.minX + col * moduleSize + Math.floor(moduleSize / 2);
                const centerY = bounds.minY + row * moduleSize + Math.floor(moduleSize / 2);
                
                // 采样模块区域的平均值
                let blackCount = 0;
                let totalCount = 0;
                
                for (let dy = -Math.floor(moduleSize / 3); dy <= Math.floor(moduleSize / 3); dy++) {
                    for (let dx = -Math.floor(moduleSize / 3); dx <= Math.floor(moduleSize / 3); dx++) {
                        const x = centerX + dx;
                        const y = centerY + dy;
                        
                        if (y >= 0 && y < binaryMatrix.length && x >= 0 && x < binaryMatrix[0].length) {
                            if (binaryMatrix[y][x] === 1) blackCount++;
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
        
        // 设置预览尺寸
        const maxSize = 300;
        const scale = Math.min(maxSize / image.width, maxSize / image.height);
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;
        
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.style.display = 'block';
    }

    showArtSection() {
        document.getElementById('artSection').style.display = 'block';
    }

    selectStyle(styleElement) {
        // 移除其他选择
        document.querySelectorAll('.art-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // 选中当前风格
        styleElement.classList.add('selected');
        this.selectedStyle = styleElement.dataset.style;
        
        // 启用生成按钮
        document.getElementById('generateBtn').disabled = false;
    }

    generateArtQR() {
        if (!this.qrMatrix || !this.selectedStyle) {
            alert('请先上传二维码并选择艺术风格');
            return;
        }

        const canvas = document.getElementById('result-canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算画布尺寸
        const { matrix, size } = this.qrMatrix;
        const { moduleSize, borderSize } = this.settings;
        const totalSize = (size + borderSize * 2) * moduleSize;
        
        canvas.width = totalSize;
        canvas.height = totalSize;
        
        // 清空画布
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalSize, totalSize);
        
        // 根据风格生成艺术元素
        this.renderArtisticQR(ctx, matrix, size, moduleSize, borderSize);
        
        // 显示结果
        document.getElementById('resultSection').style.display = 'block';
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
    }

    renderArtisticQR(ctx, matrix, size, moduleSize, borderSize) {
        const colors = this.getColorScheme();
        const startX = borderSize * moduleSize;
        const startY = borderSize * moduleSize;
        
        // 根据不同风格渲染
        switch (this.selectedStyle) {
            case 'winter-village':
                this.renderWinterVillage(ctx, matrix, size, moduleSize, startX, startY, colors);
                break;
            case 'forest':
                this.renderForest(ctx, matrix, size, moduleSize, startX, startY, colors);
                break;
            case 'city':
                this.renderCity(ctx, matrix, size, moduleSize, startX, startY, colors);
                break;
            case 'abstract':
                this.renderAbstract(ctx, matrix, size, moduleSize, startX, startY, colors);
                break;
            default:
                this.renderBasic(ctx, matrix, size, moduleSize, startX, startY, colors);
        }
    }

    getColorScheme() {
        const schemes = {
            classic: { dark: '#000000', light: '#ffffff' },
            winter: { dark: '#2c3e50', light: '#ecf0f1', accent: '#3498db' },
            forest: { dark: '#27ae60', light: '#e8f5e8', accent: '#f39c12' },
            sunset: { dark: '#e74c3c', light: '#fdf2e9', accent: '#f39c12' }
        };
        return schemes[this.settings.colorScheme] || schemes.classic;
    }

    renderWinterVillage(ctx, matrix, size, moduleSize, startX, startY, colors) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = startX + col * moduleSize;
                const y = startY + row * moduleSize;
                const isBlack = matrix[row][col] === 1;
                
                if (isBlack) {
                    // 绘制房屋
                    this.drawHouse(ctx, x, y, moduleSize, colors.dark, colors.accent);
                } else {
                    // 绘制雪地
                    this.drawSnow(ctx, x, y, moduleSize, colors.light);
                }
            }
        }
    }

    renderForest(ctx, matrix, size, moduleSize, startX, startY, colors) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = startX + col * moduleSize;
                const y = startY + row * moduleSize;
                const isBlack = matrix[row][col] === 1;
                
                if (isBlack) {
                    // 绘制树木
                    this.drawTree(ctx, x, y, moduleSize, colors.dark);
                } else {
                    // 绘制空地
                    this.drawGrass(ctx, x, y, moduleSize, colors.light);
                }
            }
        }
    }

    renderCity(ctx, matrix, size, moduleSize, startX, startY, colors) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = startX + col * moduleSize;
                const y = startY + row * moduleSize;
                const isBlack = matrix[row][col] === 1;
                
                if (isBlack) {
                    // 绘制建筑
                    this.drawBuilding(ctx, x, y, moduleSize, colors.dark, colors.accent);
                } else {
                    // 绘制天空/街道
                    this.drawSky(ctx, x, y, moduleSize, colors.light);
                }
            }
        }
    }

    renderAbstract(ctx, matrix, size, moduleSize, startX, startY, colors) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = startX + col * moduleSize;
                const y = startY + row * moduleSize;
                const isBlack = matrix[row][col] === 1;
                
                if (isBlack) {
                    // 绘制几何图形
                    this.drawGeometric(ctx, x, y, moduleSize, colors.dark, row, col);
                } else {
                    // 绘制背景
                    ctx.fillStyle = colors.light;
                    ctx.fillRect(x, y, moduleSize, moduleSize);
                }
            }
        }
    }

    renderBasic(ctx, matrix, size, moduleSize, startX, startY, colors) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = startX + col * moduleSize;
                const y = startY + row * moduleSize;
                const isBlack = matrix[row][col] === 1;
                
                ctx.fillStyle = isBlack ? colors.dark : colors.light;
                ctx.fillRect(x, y, moduleSize, moduleSize);
            }
        }
    }

    // 艺术元素绘制函数
    drawHouse(ctx, x, y, size, darkColor, accentColor) {
        // 房屋主体
        ctx.fillStyle = darkColor;
        ctx.fillRect(x, y + size * 0.3, size, size * 0.7);
        
        // 屋顶
        ctx.fillStyle = accentColor || darkColor;
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.3);
        ctx.lineTo(x + size / 2, y);
        ctx.lineTo(x + size, y + size * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // 窗户（小亮点）
        if (size > 8) {
            ctx.fillStyle = accentColor || '#ffeb3b';
            const windowSize = Math.max(2, size * 0.15);
            ctx.fillRect(x + size * 0.7, y + size * 0.5, windowSize, windowSize);
        }
    }

    drawSnow(ctx, x, y, size, lightColor) {
        ctx.fillStyle = lightColor;
        ctx.fillRect(x, y, size, size);
        
        // 添加雪花效果
        if (size > 6 && Math.random() < 0.3) {
            ctx.fillStyle = '#e3f2fd';
            const snowSize = Math.max(1, size * 0.2);
            ctx.fillRect(x + Math.random() * size, y + Math.random() * size, snowSize, snowSize);
        }
    }

    drawTree(ctx, x, y, size, darkColor) {
        // 树干
        ctx.fillStyle = '#8d6e63';
        const trunkWidth = Math.max(2, size * 0.3);
        ctx.fillRect(x + (size - trunkWidth) / 2, y + size * 0.6, trunkWidth, size * 0.4);
        
        // 树冠
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size * 0.4, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawGrass(ctx, x, y, size, lightColor) {
        ctx.fillStyle = lightColor;
        ctx.fillRect(x, y, size, size);
        
        // 添加草地纹理
        if (size > 4) {
            ctx.fillStyle = '#c8e6c9';
            for (let i = 0; i < 3; i++) {
                const grassX = x + Math.random() * size;
                const grassY = y + Math.random() * size;
                ctx.fillRect(grassX, grassY, 1, Math.max(1, size * 0.2));
            }
        }
    }

    drawBuilding(ctx, x, y, size, darkColor, accentColor) {
        ctx.fillStyle = darkColor;
        ctx.fillRect(x, y, size, size);
        
        // 添加窗户
        if (size > 6) {
            const windowCount = Math.floor(size / 4);
            for (let i = 0; i < windowCount; i++) {
                if (Math.random() < 0.7) {
                    ctx.fillStyle = accentColor || '#ffeb3b';
                    const windowSize = Math.max(1, size * 0.15);
                    const windowX = x + (i % 2) * size * 0.6 + size * 0.1;
                    const windowY = y + Math.floor(i / 2) * size * 0.4 + size * 0.1;
                    ctx.fillRect(windowX, windowY, windowSize, windowSize);
                }
            }
        }
    }

    drawSky(ctx, x, y, size, lightColor) {
        ctx.fillStyle = lightColor;
        ctx.fillRect(x, y, size, size);
        
        // 添加云朵效果
        if (size > 8 && Math.random() < 0.1) {
            ctx.fillStyle = '#f5f5f5';
            ctx.beginPath();
            ctx.arc(x + size * 0.3, y + size * 0.3, size * 0.2, 0, Math.PI * 2);
            ctx.arc(x + size * 0.7, y + size * 0.3, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawGeometric(ctx, x, y, size, darkColor, row, col) {
        ctx.fillStyle = darkColor;
        
        // 根据位置选择不同的几何形状
        const shapeType = (row + col) % 4;
        
        switch (shapeType) {
            case 0: // 矩形
                ctx.fillRect(x, y, size, size);
                break;
            case 1: // 圆形
                ctx.beginPath();
                ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 2: // 三角形
                ctx.beginPath();
                ctx.moveTo(x + size / 2, y);
                ctx.lineTo(x, y + size);
                ctx.lineTo(x + size, y + size);
                ctx.closePath();
                ctx.fill();
                break;
            case 3: // 菱形
                ctx.beginPath();
                ctx.moveTo(x + size / 2, y);
                ctx.lineTo(x + size, y + size / 2);
                ctx.lineTo(x + size / 2, y + size);
                ctx.lineTo(x, y + size / 2);
                ctx.closePath();
                ctx.fill();
                break;
        }
    }

    downloadResult() {
        const canvas = document.getElementById('result-canvas');
        const link = document.createElement('a');
        link.download = `art-qr-${this.selectedStyle}-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new QRCodeArtGenerator();
});
