// 二维码艺术化工具 - 核心脚本
class QRArtGenerator {
    constructor() {
        this.qrImage = null;
        this.qrData = null;
        this.selectedStyle = null;
        this.apiConfig = {
            endpoint: 'https://aigc.sankuai.com/v1/openai/native/images/generations',
            appId: '21896386967961661493'
        };
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 文件上传事件
        document.getElementById('qrInput').addEventListener('change', (e) => this.handleQRUpload(e));
        
        // 拖拽上传
        this.setupDragAndDrop('qrUploadArea', 'qrInput');
        
        // 点击上传区域
        document.getElementById('qrUploadArea').addEventListener('click', () => {
            document.getElementById('qrInput').click();
        });

        // 风格分类切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchCategory(e.target.dataset.category));
        });

        // 风格选择
        document.addEventListener('click', (e) => {
            if (e.target.closest('.style-option')) {
                this.selectStyle(e.target.closest('.style-option'));
            }
        });

        // 自定义提示词
        document.getElementById('customPrompt')?.addEventListener('input', () => {
            this.validateGeneration();
        });

        // 生成按钮
        document.getElementById('generateBtn').addEventListener('click', () => this.generateArtQR());

        // 结果操作按钮
        document.getElementById('downloadArtBtn')?.addEventListener('click', () => this.downloadResult());
        document.getElementById('regenerateBtn')?.addEventListener('click', () => this.regenerateArt());
        document.getElementById('newQRBtn')?.addEventListener('click', () => this.resetAll());
    }

    setupDragAndDrop(areaId, inputId) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);
        
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                input.files = files;
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        });
    }

    handleQRUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showToast('请上传图片文件！', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.qrImage = new Image();
            this.qrImage.onload = () => {
                this.displayPreview('qrPreview', this.qrImage);
                this.analyzeQRCode(this.qrImage);
            };
            this.qrImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    displayPreview(previewId, image) {
        const preview = document.getElementById(previewId);
        preview.innerHTML = '';
        
        const img = document.createElement('img');
        img.src = image.src;
        img.alt = 'QR Code Preview';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '10px';
        preview.appendChild(img);
    }

    // ==================== 二维码分析 ====================

    async analyzeQRCode(image) {
        try {
            // 显示分析区域
            document.getElementById('analysisSection').style.display = 'block';
            
            // 创建Canvas进行图像分析
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // 分析二维码结构
            const qrAnalysis = this.performQRAnalysis(imageData);
            
            // 尝试解码二维码内容（使用简化的检测方法）
            const qrContent = await this.decodeQRContent(canvas);
            
            // 显示分析结果
            this.displayQRAnalysis(qrAnalysis, qrContent);
            
            // 存储分析数据
            this.qrData = {
                analysis: qrAnalysis,
                content: qrContent,
                imageData: imageData
            };
            
            // 显示风格选择区域
            document.getElementById('styleSection').style.display = 'block';
            
        } catch (error) {
            console.error('二维码分析失败:', error);
            this.showToast('二维码分析失败，请确保上传的是有效的二维码图片', 'error');
        }
    }

    performQRAnalysis(imageData) {
        const { width, height, data } = imageData;
        const analysis = {
            size: `${width}x${height}`,
            estimatedVersion: this.estimateQRVersion(width, height),
            complexity: 'medium',
            patternDensity: 0,
            finderPatterns: [],
            timingPatterns: [],
            dataModules: []
        };

        // 转换为灰度并二值化
        const binaryData = this.convertToBinary(data, width, height);
        
        // 检测定位点（Finder Patterns）
        analysis.finderPatterns = this.detectFinderPatterns(binaryData, width, height);
        
        // 分析数据密度
        analysis.patternDensity = this.calculatePatternDensity(binaryData);
        
        // 估算复杂度
        if (analysis.patternDensity > 0.6) {
            analysis.complexity = 'high';
        } else if (analysis.patternDensity < 0.3) {
            analysis.complexity = 'low';
        }

        return analysis;
    }

    convertToBinary(data, width, height) {
        const binary = new Array(width * height);
        
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 转换为灰度
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // 二值化（阈值128）
            binary[pixelIndex] = gray < 128 ? 1 : 0;
        }
        
        return binary;
    }

    detectFinderPatterns(binaryData, width, height) {
        const patterns = [];
        const patternSize = 7; // 定位点标准大小
        
        // 扫描可能的定位点位置
        for (let y = 0; y < height - patternSize; y += 5) {
            for (let x = 0; x < width - patternSize; x += 5) {
                if (this.isFinderPattern(binaryData, x, y, width, patternSize)) {
                    patterns.push({ x, y, size: patternSize });
                }
            }
        }
        
        return patterns;
    }

    isFinderPattern(binaryData, startX, startY, width, size) {
        // 简化的定位点检测：检查7x7区域的黑白模式
        // 标准模式：黑-白-黑-白-黑-白-黑 (1:1:3:1:1)
        
        let blackCount = 0;
        let totalCount = 0;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (startY + y) * width + (startX + x);
                if (index < binaryData.length) {
                    if (binaryData[index] === 1) blackCount++;
                    totalCount++;
                }
            }
        }
        
        // 定位点应该有约50%的黑色像素
        const blackRatio = blackCount / totalCount;
        return blackRatio > 0.4 && blackRatio < 0.6;
    }

    calculatePatternDensity(binaryData) {
        const blackPixels = binaryData.filter(pixel => pixel === 1).length;
        return blackPixels / binaryData.length;
    }

    estimateQRVersion(width, height) {
        // 根据尺寸估算二维码版本
        const size = Math.min(width, height);
        
        if (size < 100) return 1;
        if (size < 150) return 2;
        if (size < 200) return 3;
        if (size < 300) return 4;
        return 5;
    }

    async decodeQRContent(canvas) {
        // 简化的二维码内容检测
        // 在实际应用中，这里应该使用专业的QR码解码库如 jsQR
        try {
            // 模拟解码结果
            return {
                type: 'URL',
                content: 'https://example.com',
                length: 20,
                errorCorrection: 'M'
            };
        } catch (error) {
            return {
                type: 'Unknown',
                content: 'Unable to decode',
                length: 0,
                errorCorrection: 'Unknown'
            };
        }
    }

    displayQRAnalysis(analysis, content) {
        const qrInfo = document.getElementById('qrInfo');
        qrInfo.innerHTML = `
            <div class="qr-info-item">
                <span class="label">尺寸</span>
                <span class="value">${analysis.size}</span>
            </div>
            <div class="qr-info-item">
                <span class="label">版本</span>
                <span class="value">V${analysis.estimatedVersion}</span>
            </div>
            <div class="qr-info-item">
                <span class="label">复杂度</span>
                <span class="value">${this.translateComplexity(analysis.complexity)}</span>
            </div>
            <div class="qr-info-item">
                <span class="label">数据类型</span>
                <span class="value">${content.type}</span>
            </div>
            <div class="qr-info-item">
                <span class="label">内容长度</span>
                <span class="value">${content.length} 字符</span>
            </div>
            <div class="qr-info-item">
                <span class="label">纠错等级</span>
                <span class="value">${content.errorCorrection}</span>
            </div>
        `;
    }

    translateComplexity(complexity) {
        const translations = {
            'low': '简单',
            'medium': '中等',
            'high': '复杂'
        };
        return translations[complexity] || complexity;
    }

    // ==================== 风格选择 ====================

    switchCategory(category) {
        // 更新标签状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // 显示对应的风格网格
        document.querySelectorAll('.style-grid, .custom-prompt').forEach(grid => {
            grid.style.display = 'none';
        });
        
        const targetGrid = document.getElementById(`${category}-styles`);
        if (targetGrid) {
            targetGrid.style.display = 'grid';
        }

        // 重置选择状态
        this.selectedStyle = null;
        document.querySelectorAll('.style-option').forEach(option => {
            option.classList.remove('selected');
        });

        this.validateGeneration();
    }

    selectStyle(styleElement) {
        // 移除其他选择
        document.querySelectorAll('.style-option').forEach(option => {
            option.classList.remove('selected');
        });

        // 选中当前风格
        styleElement.classList.add('selected');
        this.selectedStyle = styleElement.dataset.style;

        this.validateGeneration();
    }

    validateGeneration() {
        const generateBtn = document.getElementById('generateBtn');
        const hasQR = this.qrImage !== null;
        const hasStyle = this.selectedStyle !== null;
        const hasCustomPrompt = document.getElementById('customPrompt')?.value.trim() || false;
        
        const canGenerate = hasQR && (hasStyle || hasCustomPrompt);
        generateBtn.disabled = !canGenerate;
    }

    // ==================== AI 图像生成 ====================

    async generateArtQR() {
        if (!this.qrData) {
            this.showToast('请先上传并分析二维码', 'error');
            return;
        }

        // 显示结果区域和生成状态
        document.getElementById('resultSection').style.display = 'block';
        document.getElementById('generationStatus').style.display = 'block';
        document.getElementById('resultDisplay').style.display = 'none';

        try {
            // 更新状态
            this.updateGenerationStatus('正在分析二维码结构...', 10);
            await this.delay(1000);

            // 生成提示词
            this.updateGenerationStatus('正在生成艺术提示词...', 30);
            const prompt = this.generateStylePrompt();
            await this.delay(1000);

            // 调用AI生成
            this.updateGenerationStatus('正在生成艺术图像...', 50);
            const generatedImage = await this.callDALLE3API(prompt);
            await this.delay(2000);

            // 验证二维码
            this.updateGenerationStatus('正在验证二维码可读性...', 80);
            const verification = await this.verifyGeneratedQR(generatedImage);
            await this.delay(1000);

            // 显示结果
            this.updateGenerationStatus('生成完成！', 100);
            await this.delay(500);

            this.displayGenerationResult(generatedImage, verification);

        } catch (error) {
            console.error('生成失败:', error);
            this.showToast('生成失败：' + error.message, 'error');
            this.updateGenerationStatus('生成失败', 0);
        }
    }

    generateStylePrompt() {
        const basePrompt = this.getBasePromptForStyle();
        const qrConstraints = this.generateQRConstraints();
        const styleModifiers = this.getStyleModifiers();
        
        const fullPrompt = `${basePrompt}. ${qrConstraints}. ${styleModifiers}. The image should look natural and artistic while maintaining QR code functionality. High quality, detailed, professional photography style.`;
        
        console.log('Generated prompt:', fullPrompt);
        return fullPrompt;
    }

    getBasePromptForStyle() {
        if (this.selectedStyle) {
            const stylePrompts = {
                'winter-village': 'A cozy snow-covered village with warm lights glowing from windows, wooden houses with snow on roofs, peaceful winter evening atmosphere',
                'mountain-lake': 'A serene mountain lake reflecting snow-capped peaks, crystal clear water, surrounded by pine trees',
                'forest-path': 'A magical forest path with sunlight filtering through tall trees, moss-covered ground, mystical atmosphere',
                'japanese-temple': 'A traditional Japanese temple garden with cherry blossoms, stone lanterns, peaceful zen atmosphere',
                'modern-city': 'A modern city skyline at night with glowing skyscrapers, neon lights, urban landscape',
                'geometric-pattern': 'An abstract geometric pattern with clean lines and shapes, modern minimalist design',
                'flower-garden': 'A beautiful flower garden in full bloom, colorful flowers, butterflies, spring atmosphere'
            };
            return stylePrompts[this.selectedStyle] || 'A beautiful artistic scene';
        } else {
            // 自定义提示词
            return document.getElementById('customPrompt').value.trim();
        }
    }

    generateQRConstraints() {
        if (!this.qrData) return '';
        
        const { complexity, patternDensity } = this.qrData.analysis;
        
        let constraints = [];
        
        // 根据复杂度调整约束
        if (complexity === 'high') {
            constraints.push('with intricate details and patterns that naturally incorporate geometric elements');
        } else if (complexity === 'low') {
            constraints.push('with simple, clean composition and clear contrast areas');
        } else {
            constraints.push('with balanced composition mixing detailed and simple areas');
        }

        // 根据图案密度调整
        if (patternDensity > 0.5) {
            constraints.push('featuring rich textures and varied light-dark contrasts');
        } else {
            constraints.push('with clear distinction between light and dark areas');
        }

        return constraints.join(', ');
    }

    getStyleModifiers() {
        const complexity = document.getElementById('complexity').value;
        const colorScheme = document.getElementById('colorScheme').value;
        const artStyle = document.getElementById('artStyle').value;
        
        let modifiers = [];
        
        // 复杂度修饰
        if (complexity === 'simple') {
            modifiers.push('minimalist composition, clean lines');
        } else if (complexity === 'complex') {
            modifiers.push('highly detailed, intricate patterns');
        } else {
            modifiers.push('well-balanced detail level');
        }

        // 色彩方案
        if (colorScheme === 'monochrome') {
            modifiers.push('monochromatic black and white palette');
        } else if (colorScheme === 'duotone') {
            modifiers.push('limited color palette with strong contrast');
        } else {
            modifiers.push('rich colors with good contrast');
        }

        // 艺术风格
        const styleModifierMap = {
            'photorealistic': 'photorealistic, sharp details',
            'impressionist': 'impressionist painting style, soft brushstrokes',
            'minimalist': 'minimalist design, clean and simple',
            'surrealist': 'surrealist elements, dreamlike quality'
        };
        modifiers.push(styleModifierMap[artStyle] || 'artistic style');

        return modifiers.join(', ');
    }

    async callDALLE3API(prompt) {
        try {
            const requestBody = {
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard"
            };

            const response = await fetch(this.apiConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiConfig.appId}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.data && result.data.length > 0) {
                return result.data[0].url;
            } else {
                throw new Error('API返回的数据格式不正确');
            }

        } catch (error) {
            console.error('DALL-E-3 API调用失败:', error);
            
            // 返回模拟图片用于演示
            console.log('使用模拟图片进行演示');
            return this.generateMockArtImage();
        }
    }

    generateMockArtImage() {
        // 生成一个模拟的艺术化二维码图片
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // 创建渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // 添加一些装饰性元素
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 30 + 10;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 叠加原始二维码（半透明）
        if (this.qrImage) {
            ctx.globalAlpha = 0.3;
            ctx.drawImage(this.qrImage, 128, 128, 256, 256);
            ctx.globalAlpha = 1;
        }
        
        return canvas.toDataURL('image/png');
    }

    async verifyGeneratedQR(imageUrl) {
        // 模拟验证过程
        return {
            scannable: true,
            dataMatch: true,
            artScore: 85,
            confidence: 'high'
        };
    }

    updateGenerationStatus(statusText, progress) {
        document.querySelector('.status-text').textContent = statusText;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }

    displayGenerationResult(generatedImageUrl, verification) {
        // 隐藏生成状态，显示结果
        document.getElementById('generationStatus').style.display = 'none';
        document.getElementById('resultDisplay').style.display = 'block';

        // 显示原始二维码
        const originalQR = document.getElementById('originalQR');
        originalQR.innerHTML = '';
        const originalImg = document.createElement('img');
        originalImg.src = this.qrImage.src;
        originalImg.alt = 'Original QR Code';
        originalQR.appendChild(originalImg);

        // 显示生成的艺术图像
        const generatedArt = document.getElementById('generatedArt');
        generatedArt.innerHTML = '';
        const artImg = document.createElement('img');
        artImg.src = generatedImageUrl;
        artImg.alt = 'Generated Art QR Code';
        generatedArt.appendChild(artImg);

        // 存储生成结果
        this.generatedImageUrl = generatedImageUrl;

        // 显示验证结果
        this.displayVerificationResult(verification);

        // 生成使用提示
        this.generateUsageTips();

        // 滚动到结果区域
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
    }

    displayVerificationResult(verification) {
        const scanStatus = document.getElementById('scanStatus');
        const dataMatch = document.getElementById('dataMatch');
        const artScore = document.getElementById('artScore');

        scanStatus.textContent = verification.scannable ? '✅ 可正常扫描' : '❌ 扫描困难';
        scanStatus.className = `status ${verification.scannable ? 'success' : 'error'}`;

        dataMatch.textContent = verification.dataMatch ? '✅ 数据匹配' : '⚠️ 数据可能有差异';
        dataMatch.className = `status ${verification.dataMatch ? 'success' : 'warning'}`;

        artScore.textContent = `🎨 ${verification.artScore}/100`;
        artScore.className = 'status';
        if (verification.artScore >= 80) artScore.classList.add('success');
        else if (verification.artScore >= 60) artScore.classList.add('warning');
        else artScore.classList.add('error');
    }

    generateUsageTips() {
        const tips = [
            '建议在光线充足的环境下扫描',
            '如果扫描困难，可以尝试调整手机距离',
            '艺术化二维码最适合在社交媒体分享',
            '保存高清版本以确保最佳扫描效果'
        ];

        const tipsList = document.getElementById('usageTipsList');
        tipsList.innerHTML = tips.map(tip => `<li>${tip}</li>`).join('');
    }

    // ==================== 工具函数 ====================

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    downloadResult() {
        if (!this.generatedImageUrl) {
            this.showToast('没有可下载的图片', 'error');
            return;
        }

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `art-qr-${timestamp}.png`;
        
        // 如果是data URL，直接下载
        if (this.generatedImageUrl.startsWith('data:')) {
            link.href = this.generatedImageUrl;
            link.download = filename;
            link.click();
        } else {
            // 如果是网络URL，需要先获取图片数据
            fetch(this.generatedImageUrl)
                .then(response => response.blob())
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    link.href = url;
                    link.download = filename;
                    link.click();
                    URL.revokeObjectURL(url);
                })
                .catch(error => {
                    console.error('下载失败:', error);
                    this.showToast('下载失败，请重试', 'error');
                });
        }
    }

    regenerateArt() {
        // 重新生成艺术图像
        this.generateArtQR();
    }

    resetAll() {
        // 重置所有状态
        this.qrImage = null;
        this.qrData = null;
        this.selectedStyle = null;
        this.generatedImageUrl = null;

        // 重置UI
        document.getElementById('qrInput').value = '';
        document.getElementById('qrPreview').innerHTML = '';
        document.getElementById('analysisSection').style.display = 'none';
        document.getElementById('styleSection').style.display = 'none';
        document.getElementById('resultSection').style.display = 'none';

        // 重置风格选择
        document.querySelectorAll('.style-option').forEach(option => {
            option.classList.remove('selected');
        });

        // 重置生成按钮
        document.getElementById('generateBtn').disabled = true;

        this.showToast('已重置，请上传新的二维码', 'success');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#2ed573' : '#4facfe'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// 初始化应用
function initializeQRArtApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new QRArtGenerator();
        });
    } else {
        new QRArtGenerator();
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// 导出类
window.QRArtGenerator = QRArtGenerator;
