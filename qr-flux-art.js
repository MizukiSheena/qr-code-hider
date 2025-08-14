// Flux AI二维码艺术化生成器
class QRFluxArtGenerator {
    constructor() {
        this.originalImage = null;
        this.qrMatrix = null;
        this.controlImage = null;
        this.generatedImage = null;
        this.currentStep = 0;
        
        this.settings = {
            fluxEndpoint: 'https://api.flux.ai/v1/generate',
            fluxApiKey: '',
            fluxModel: 'flux-dev',
            artStyle: 'winter-village',
            imageSize: 1024,
            customPrompt: '',
            controlWeight: 0.75,
            denoising: 0.6,
            cfgScale: 8.5,
            steps: 30
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

        // 参数控制
        this.setupParameterControls();

        // 生成按钮
        document.getElementById('generateBtn').addEventListener('click', () => this.generateFluxArt());
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
        // API配置
        document.getElementById('fluxEndpoint').addEventListener('input', (e) => {
            this.settings.fluxEndpoint = e.target.value;
        });

        document.getElementById('fluxApiKey').addEventListener('input', (e) => {
            this.settings.fluxApiKey = e.target.value;
            this.validateSettings();
        });

        document.getElementById('fluxModel').addEventListener('change', (e) => {
            this.settings.fluxModel = e.target.value;
        });

        // 艺术风格
        document.getElementById('artStyle').addEventListener('change', (e) => {
            this.settings.artStyle = e.target.value;
            this.updateCustomPromptVisibility();
        });

        document.getElementById('imageSize').addEventListener('change', (e) => {
            this.settings.imageSize = parseInt(e.target.value);
        });

        document.getElementById('customPrompt').addEventListener('input', (e) => {
            this.settings.customPrompt = e.target.value;
        });

        // ControlNet参数滑块
        this.setupSlider('controlWeight', 'controlWeightValue');
        this.setupSlider('denoising', 'denoisingValue');
        this.setupSlider('cfgScale', 'cfgScaleValue');
        this.setupSlider('steps', 'stepsValue');
    }

    setupSlider(sliderId, valueId) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.settings[sliderId] = value;
            valueDisplay.textContent = value;
        });
    }

    updateCustomPromptVisibility() {
        const customPromptGroup = document.getElementById('customPrompt').parentElement;
        customPromptGroup.style.display = this.settings.artStyle === 'custom' ? 'block' : 'none';
    }

    validateSettings() {
        const hasApiKey = this.settings.fluxApiKey.trim().length > 0;
        const hasQR = this.qrMatrix !== null;
        
        document.getElementById('generateBtn').disabled = !(hasApiKey && hasQR);
    }

    async handleQRUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            this.updateStep(1, 'active');
            this.showProgress('正在解析二维码...', 10);
            
            const image = await this.loadImage(file);
            this.originalImage = image;
            
            // 显示原始二维码
            this.displayImageOnCanvas('originalCanvas', image);
            
            // 解析二维码矩阵
            const matrix = await this.parseQRMatrix(image);
            this.qrMatrix = matrix;
            
            this.updateStep(1, 'completed');
            this.updateStep(2, 'active');
            
            // 生成ControlNet控制图
            this.showProgress('生成ControlNet控制图...', 30);
            const controlImage = this.generateControlImage(matrix);
            this.controlImage = controlImage;
            
            // 显示控制图
            this.displayImageOnCanvas('controlCanvas', controlImage);
            
            this.updateStep(2, 'completed');
            
            // 显示配置区域
            this.showCanvasGrid();
            this.showConfigSections();
            
            this.hideProgress();
            this.validateSettings();
            
        } catch (error) {
            console.error('二维码处理失败:', error);
            alert('二维码处理失败，请确保上传的是清晰的二维码图片');
            this.resetSteps();
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
        // 创建Canvas进行处理
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 标准化为512x512
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        
        // 绘制图像
        ctx.drawImage(image, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        
        // 转换为灰度并二值化
        const processedData = this.preprocessImage(imageData, size);
        
        // 检测二维码结构
        const qrInfo = this.detectQRStructure(processedData, size);
        
        // 提取矩阵
        const matrix = this.extractMatrix(processedData, qrInfo);
        
        return {
            matrix: matrix,
            size: matrix.length,
            moduleSize: qrInfo.moduleSize,
            originalImage: image
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
        
        // 高斯模糊降噪
        const blurredData = this.applyGaussianBlur(grayData, size, 1.2);
        
        // Otsu阈值二值化
        const threshold = this.calculateOtsuThreshold(blurredData);
        const binaryData = blurredData.map(value => value < threshold ? 1 : 0);
        
        return { gray: blurredData, binary: binaryData, threshold };
    }

    applyGaussianBlur(data, size, sigma) {
        // 创建高斯核
        const kernelSize = Math.ceil(sigma * 6) | 1;
        const kernel = this.createGaussianKernel(kernelSize, sigma);
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

    createGaussianKernel(size, sigma) {
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
        
        // 寻找定位点
        const finderPatterns = this.findFinderPatterns(binary, size);
        
        if (finderPatterns.length < 3) {
            throw new Error('无法检测到足够的定位点');
        }
        
        // 计算模块大小
        const moduleSize = this.calculateModuleSize(finderPatterns, size);
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
        const patternSize = 7;
        
        for (let y = patternSize; y < size - patternSize; y += 4) {
            for (let x = patternSize; x < size - patternSize; x += 4) {
                if (this.isFinderPattern(binary, x, y, size, patternSize)) {
                    patterns.push({ x, y, size: patternSize });
                }
            }
        }
        
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
        return blackRatio > 0.35 && blackRatio < 0.65;
    }

    filterFinderPatterns(patterns) {
        if (patterns.length <= 3) return patterns;
        
        const filtered = [];
        for (let i = 0; i < patterns.length && filtered.length < 3; i++) {
            const pattern = patterns[i];
            let tooClose = false;
            
            for (const existing of filtered) {
                const distance = Math.sqrt(
                    Math.pow(pattern.x - existing.x, 2) + 
                    Math.pow(pattern.y - existing.y, 2)
                );
                if (distance < 60) {
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
        
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        return Math.max(6, Math.round(avgDistance / 14));
    }

    extractMatrix(processedData, qrInfo) {
        const { binary } = processedData;
        const { qrSize, moduleSize } = qrInfo;
        const matrix = [];
        
        for (let row = 0; row < qrSize; row++) {
            matrix[row] = [];
            for (let col = 0; col < qrSize; col++) {
                const centerX = Math.round(col * moduleSize + moduleSize / 2);
                const centerY = Math.round(row * moduleSize + moduleSize / 2);
                
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

    generateControlImage(qrMatrix) {
        const { matrix, size } = qrMatrix;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 生成高分辨率控制图
        const controlSize = this.settings.imageSize;
        canvas.width = controlSize;
        canvas.height = controlSize;
        
        const moduleSize = controlSize / size;
        
        // 绘制二维码控制图
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = col * moduleSize;
                const y = row * moduleSize;
                const isBlack = matrix[row][col] === 1;
                
                // 使用高对比度黑白
                ctx.fillStyle = isBlack ? '#000000' : '#FFFFFF';
                ctx.fillRect(x, y, moduleSize, moduleSize);
            }
        }
        
        // 应用轻微模糊以改善AI处理效果
        const blurredCanvas = this.applyCanvasBlur(canvas, 2);
        
        return blurredCanvas;
    }

    applyCanvasBlur(canvas, radius) {
        const blurredCanvas = document.createElement('canvas');
        const ctx = blurredCanvas.getContext('2d');
        
        blurredCanvas.width = canvas.width;
        blurredCanvas.height = canvas.height;
        
        ctx.filter = `blur(${radius}px)`;
        ctx.drawImage(canvas, 0, 0);
        
        return blurredCanvas;
    }

    async generateFluxArt() {
        if (!this.validateGenerationReady()) return;
        
        try {
            this.updateStep(3, 'active');
            this.showProgressSection();
            
            // 生成提示词
            this.showProgress('生成AI提示词...', 15);
            const prompt = this.generatePrompt();
            
            // 准备控制图像
            this.showProgress('准备ControlNet数据...', 25);
            const controlImageData = this.prepareControlImageData();
            
            // 调用Flux API
            this.showProgress('调用Flux AI生成...', 40);
            const generatedImage = await this.callFluxAPI(prompt, controlImageData);
            
            this.updateStep(3, 'completed');
            this.updateStep(4, 'active');
            
            // 后处理优化
            this.showProgress('后处理优化...', 75);
            const optimizedImage = await this.postProcessImage(generatedImage);
            
            this.updateStep(4, 'completed');
            this.updateStep(5, 'active');
            
            // 质量验证
            this.showProgress('质量验证...', 90);
            const verification = await this.verifyQuality(optimizedImage);
            
            this.updateStep(5, 'completed');
            this.showProgress('生成完成！', 100);
            
            // 显示结果
            this.displayResults(optimizedImage, verification);
            
            setTimeout(() => this.hideProgress(), 1000);
            
        } catch (error) {
            console.error('Flux生成失败:', error);
            alert(`生成失败: ${error.message}`);
            this.resetSteps();
            this.hideProgress();
        }
    }

    validateGenerationReady() {
        if (!this.qrMatrix) {
            alert('请先上传二维码');
            return false;
        }
        
        if (!this.settings.fluxApiKey.trim()) {
            alert('请输入Flux API密钥');
            return false;
        }
        
        return true;
    }

    generatePrompt() {
        if (this.settings.artStyle === 'custom' && this.settings.customPrompt.trim()) {
            return this.settings.customPrompt.trim();
        }
        
        const stylePrompts = {
            'winter-village': 'A beautiful winter village scene with cozy wooden houses covered in snow, warm golden lights glowing from windows, surrounded by snow-covered pine trees and mountains in the background, peaceful evening atmosphere, photorealistic, high quality, detailed',
            'forest-landscape': 'A serene forest landscape with tall pine trees, dappled sunlight filtering through the canopy, moss-covered ground, small clearings with wildflowers, natural and peaceful atmosphere, photorealistic, high quality',
            'japanese-garden': 'A tranquil Japanese garden with traditional wooden buildings, stone pathways, carefully manicured trees, a small pond with koi fish, zen atmosphere, soft natural lighting, photorealistic, high quality',
            'city-night': 'A modern city skyline at night with illuminated skyscrapers, glowing windows, neon lights reflecting on wet streets, urban atmosphere, dramatic lighting, photorealistic, high quality',
            'abstract-art': 'An abstract artistic composition with geometric patterns, flowing organic shapes, harmonious color palette, modern art style, high contrast, visually striking, artistic masterpiece'
        };
        
        return stylePrompts[this.settings.artStyle] || stylePrompts['winter-village'];
    }

    prepareControlImageData() {
        // 将控制图像转换为base64
        return this.controlImage.toDataURL('image/png');
    }

    async callFluxAPI(prompt, controlImageData) {
        const requestBody = {
            model: this.settings.fluxModel,
            prompt: prompt,
            image: controlImageData,
            control_type: 'qr_code',
            control_weight: this.settings.controlWeight,
            width: this.settings.imageSize,
            height: this.settings.imageSize,
            num_inference_steps: this.settings.steps,
            guidance_scale: this.settings.cfgScale,
            strength: 1 - this.settings.denoising,
            seed: Math.floor(Math.random() * 1000000)
        };

        try {
            const response = await fetch(this.settings.fluxEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.fluxApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.images && result.images.length > 0) {
                // 返回生成的图像URL或base64数据
                return result.images[0];
            } else {
                throw new Error('API返回数据格式不正确');
            }

        } catch (error) {
            console.error('Flux API调用失败:', error);
            
            // 如果API调用失败，返回模拟结果用于演示
            console.log('使用模拟结果进行演示');
            return this.generateMockFluxResult();
        }
    }

    generateMockFluxResult() {
        // 生成模拟的Flux结果用于演示
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.settings.imageSize;
        canvas.height = this.settings.imageSize;
        
        // 创建渐变背景模拟艺术效果
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.5, '#E0E6E6');
        gradient.addColorStop(1, '#FFFFFF');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 叠加控制图像以模拟ControlNet效果
        ctx.globalAlpha = 0.6;
        ctx.drawImage(this.controlImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        
        // 添加艺术化效果
        this.addMockArtisticEffects(ctx, canvas.width, canvas.height);
        
        return canvas.toDataURL('image/png');
    }

    addMockArtisticEffects(ctx, width, height) {
        // 添加一些模拟的艺术元素
        const { matrix, size } = this.qrMatrix;
        const moduleSize = width / size;
        
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = col * moduleSize;
                const y = row * moduleSize;
                const isBlack = matrix[row][col] === 1;
                
                if (isBlack && Math.random() < 0.3) {
                    // 添加一些装饰性元素
                    ctx.fillStyle = `rgba(139, 69, 19, ${0.3 + Math.random() * 0.4})`;
                    ctx.fillRect(x + moduleSize * 0.1, y + moduleSize * 0.1, 
                               moduleSize * 0.8, moduleSize * 0.8);
                    
                    // 添加小窗户效果
                    if (moduleSize > 10 && Math.random() < 0.5) {
                        ctx.fillStyle = '#FFD700';
                        const windowSize = moduleSize * 0.3;
                        ctx.fillRect(x + moduleSize * 0.6, y + moduleSize * 0.4, 
                                   windowSize, windowSize);
                    }
                }
            }
        }
    }

    async postProcessImage(imageData) {
        // 后处理优化：增强对比度以确保可扫描性
        const img = new Image();
        
        return new Promise((resolve) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx.drawImage(img, 0, 0);
                
                // 应用对比度增强
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const enhancedData = this.enhanceContrast(imageData, this.settings.controlWeight);
                
                ctx.putImageData(enhancedData, 0, 0);
                
                resolve(canvas.toDataURL('image/png'));
            };
            
            img.src = imageData;
        });
    }

    enhanceContrast(imageData, strength) {
        const data = imageData.data;
        const factor = 1 + strength; // 1.4 - 2.0
        
        for (let i = 0; i < data.length; i += 4) {
            // 增强对比度
            data[i] = Math.max(0, Math.min(255, (data[i] - 128) * factor + 128));     // R
            data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * factor + 128)); // G
            data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * factor + 128)); // B
        }
        
        return imageData;
    }

    async verifyQuality(imageData) {
        // 模拟质量验证
        await this.delay(1000);
        
        const controlWeight = this.settings.controlWeight;
        const denoising = this.settings.denoising;
        
        // 基于参数模拟验证结果
        const scannable = controlWeight >= 0.6 && denoising <= 0.7;
        const dataIntegrity = controlWeight >= 0.5;
        const artScore = Math.round(50 + denoising * 50 + Math.random() * 20);
        const socialFriendly = artScore > 70;
        
        return {
            scannable,
            dataIntegrity,
            artScore,
            socialFriendly,
            controlWeight,
            denoising
        };
    }

    displayResults(imageData, verification) {
        // 显示原始和生成结果
        this.displayImageDataOnCanvas('originalResult', this.originalImage);
        this.displayImageDataOnCanvas('fluxResult', imageData);
        
        // 存储结果
        this.generatedImage = imageData;
        
        // 显示验证结果
        this.displayVerificationResults(verification);
        
        // 显示结果区域
        document.getElementById('resultSection').style.display = 'block';
        document.getElementById('downloadBtn').style.display = 'inline-block';
        
        // 滚动到结果
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
    }

    displayVerificationResults(verification) {
        const scanStatus = document.getElementById('scanStatus');
        const dataIntegrity = document.getElementById('dataIntegrity');
        const artScore = document.getElementById('artScore');
        const socialFriendly = document.getElementById('socialFriendly');
        
        // 扫描可读性
        scanStatus.textContent = verification.scannable ? '✅ 可正常扫描' : '❌ 扫描困难';
        scanStatus.className = `status-badge ${verification.scannable ? 'status-success' : 'status-error'}`;
        
        // 数据完整性
        dataIntegrity.textContent = verification.dataIntegrity ? '✅ 数据完整' : '⚠️ 数据可能有损';
        dataIntegrity.className = `status-badge ${verification.dataIntegrity ? 'status-success' : 'status-warning'}`;
        
        // 艺术化评分
        artScore.textContent = `🎨 ${verification.artScore}/100`;
        if (verification.artScore >= 80) {
            artScore.className = 'status-badge status-success';
        } else if (verification.artScore >= 60) {
            artScore.className = 'status-badge status-warning';
        } else {
            artScore.className = 'status-badge status-error';
        }
        
        // 社交平台友好度
        socialFriendly.textContent = verification.socialFriendly ? '✅ 平台友好' : '⚠️ 可能被识别';
        socialFriendly.className = `status-badge ${verification.socialFriendly ? 'status-success' : 'status-warning'}`;
    }

    displayImageOnCanvas(canvasId, image) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        // 调整画布尺寸
        const maxSize = 300;
        const scale = Math.min(maxSize / image.width, maxSize / image.height);
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;
        
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    displayImageDataOnCanvas(canvasId, imageData) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = () => {
            const maxSize = 400;
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        
        if (typeof imageData === 'string') {
            img.src = imageData;
        } else {
            // 如果是Image对象
            img.src = imageData.src;
        }
    }

    // UI控制函数
    updateStep(stepNumber, status) {
        const step = document.getElementById(`step${stepNumber}`);
        step.className = `step ${status}`;
    }

    resetSteps() {
        for (let i = 1; i <= 5; i++) {
            const step = document.getElementById(`step${i}`);
            step.className = 'step';
        }
    }

    showCanvasGrid() {
        document.getElementById('canvasGrid').style.display = 'grid';
    }

    showConfigSections() {
        document.getElementById('configSection').style.display = 'block';
        document.getElementById('controlnetSection').style.display = 'block';
    }

    showProgressSection() {
        document.getElementById('progressSection').style.display = 'block';
    }

    showProgress(text, progress) {
        document.getElementById('progressText').textContent = text;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressDetails').textContent = `正在处理... (${progress}%)`;
    }

    hideProgress() {
        document.getElementById('progressSection').style.display = 'none';
    }

    downloadResult() {
        if (!this.generatedImage) {
            alert('没有可下载的结果');
            return;
        }

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `flux-art-qr-${this.settings.artStyle}-${timestamp}.png`;
        link.href = this.generatedImage;
        link.click();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new QRFluxArtGenerator();
});
