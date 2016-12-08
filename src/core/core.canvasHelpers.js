import {drawRoundedRectangle} from './core.helpers';

export const drawPoint = function(ctx, pointStyle, radius, x, y) {
	var type, edgeLength, xOffset, yOffset, height, size;

	if (typeof pointStyle === 'object') {
		type = pointStyle.toString();
		if (type === '[object HTMLImageElement]' || type === '[object HTMLCanvasElement]') {
			ctx.drawImage(pointStyle, x - pointStyle.width / 2, y - pointStyle.height / 2);
			return;
		}
	}

	if (isNaN(radius) || radius <= 0) {
		return;
	}

	switch (pointStyle) {
	// Default includes circle
	default:
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();
		break;
	case 'triangle':
		ctx.beginPath();
		edgeLength = 3 * radius / Math.sqrt(3);
		height = edgeLength * Math.sqrt(3) / 2;
		ctx.moveTo(x - edgeLength / 2, y + height / 3);
		ctx.lineTo(x + edgeLength / 2, y + height / 3);
		ctx.lineTo(x, y - 2 * height / 3);
		ctx.closePath();
		ctx.fill();
		break;
	case 'rect':
		size = 1 / Math.SQRT2 * radius;
		ctx.beginPath();
		ctx.fillRect(x - size, y - size, 2 * size, 2 * size);
		ctx.strokeRect(x - size, y - size, 2 * size, 2 * size);
		break;
	case 'rectRounded':
		var offset = radius / Math.SQRT2;
		var leftX = x - offset;
		var topY = y - offset;
		var sideSize = Math.SQRT2 * radius;
		drawRoundedRectangle(ctx, leftX, topY, sideSize, sideSize, radius / 2);
		ctx.fill();
		break;
	case 'rectRot':
		size = 1 / Math.SQRT2 * radius;
		ctx.beginPath();
		ctx.moveTo(x - size, y);
		ctx.lineTo(x, y + size);
		ctx.lineTo(x + size, y);
		ctx.lineTo(x, y - size);
		ctx.closePath();
		ctx.fill();
		break;
	case 'cross':
		ctx.beginPath();
		ctx.moveTo(x, y + radius);
		ctx.lineTo(x, y - radius);
		ctx.moveTo(x - radius, y);
		ctx.lineTo(x + radius, y);
		ctx.closePath();
		break;
	case 'crossRot':
		ctx.beginPath();
		xOffset = Math.cos(Math.PI / 4) * radius;
		yOffset = Math.sin(Math.PI / 4) * radius;
		ctx.moveTo(x - xOffset, y - yOffset);
		ctx.lineTo(x + xOffset, y + yOffset);
		ctx.moveTo(x - xOffset, y + yOffset);
		ctx.lineTo(x + xOffset, y - yOffset);
		ctx.closePath();
		break;
	case 'star':
		ctx.beginPath();
		ctx.moveTo(x, y + radius);
		ctx.lineTo(x, y - radius);
		ctx.moveTo(x - radius, y);
		ctx.lineTo(x + radius, y);
		xOffset = Math.cos(Math.PI / 4) * radius;
		yOffset = Math.sin(Math.PI / 4) * radius;
		ctx.moveTo(x - xOffset, y - yOffset);
		ctx.lineTo(x + xOffset, y + yOffset);
		ctx.moveTo(x - xOffset, y + yOffset);
		ctx.lineTo(x + xOffset, y - yOffset);
		ctx.closePath();
		break;
	case 'line':
		ctx.beginPath();
		ctx.moveTo(x - radius, y);
		ctx.lineTo(x + radius, y);
		ctx.closePath();
		break;
	case 'dash':
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + radius, y);
		ctx.closePath();
		break;
	}

	ctx.stroke();
};

export const clipArea = function(ctx, clipAreaObj) {
	ctx.save();
	ctx.beginPath();
	ctx.rect(clipAreaObj.left, clipAreaObj.top, clipAreaObj.right - clipAreaObj.left, clipAreaObj.bottom - clipAreaObj.top);
	ctx.clip();
};

export const unclipArea = function(ctx) {
	ctx.restore();
};
