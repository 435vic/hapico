import Canvas from 'canvas';
import * as Discord from 'discord.js';
import { XP_FUNC } from '../LevelManager.js';

const MARGIN_X = 24;
const MARGIN_Y = 26;
const backgroundColor = '#23272A';
const foregroundColor = '#121212';
const assetsDir = new URL('../../assets/', import.meta.url).pathname.slice(1);

export async function drawRankCard(member: Discord.GuildMember, xp: number, lvl: number, position: number) {

    const base_bar = await Canvas.loadImage(`${assetsDir}xpbar_empty.png`);
    const full_bar = await Canvas.loadImage(`${assetsDir}xpbar_full.png`);
    const user = member.user;
    const canvas = Canvas.createCanvas(979, 382);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = backgroundColor;
    roundRect(ctx, 0, 0, canvas.width, canvas.height, 8, true, false);
    ctx.fillStyle = foregroundColor;
    roundRect(ctx, MARGIN_X, MARGIN_Y, canvas.width-MARGIN_X*2, canvas.height-MARGIN_Y*2, 8, true, false);
    // eslint-disable-next-line no-undef
    ctx.drawImage(base_bar, MARGIN_X+10, canvas.height-MARGIN_Y-50-10, 910, 50);

    ctx.beginPath();
    ctx.arc(canvas.width/2, (canvas.height-50-10)/2-30, 87, 0, Math.PI * 2, true);
    switch(member.presence?.status) {
    case 'online':
        ctx.fillStyle = '#' + Discord.Util.resolveColor('GREEN').toString(16);
        break;
    case 'idle':
        ctx.fillStyle = '#' + Discord.Util.resolveColor('GOLD').toString(16);
        break;
    case 'offline':
        ctx.fillStyle = '#' + Discord.Util.resolveColor('DARK_GREY').toString(16);
        break;
    case 'dnd':
        ctx.fillStyle = '#' + Discord.Util.resolveColor('RED').toString(16);
        break;
    default:    
        ctx.fillStyle = '#' + Discord.Util.resolveColor('DARK_GREY').toString(16);
        break;
    }
    ctx.fill();
    ctx.closePath();

    let progress = xp/XP_FUNC(xp);
    let location = Math.floor((91*progress))*10;

    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width/2, (canvas.height-50-10)/2-30, 80, 0, Math.PI * 2, true);
    ctx.clip();
    let avatar = await Canvas.loadImage(user.displayAvatarURL({ format: 'jpg' }));
    ctx.drawImage(avatar, canvas.width/2-80, (canvas.height-50-10)/2-30-80, 160, 160);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(MARGIN_X+10, canvas.height-MARGIN_Y-50-10);
    ctx.lineTo(MARGIN_X+10+location, canvas.height-MARGIN_Y-50-10);
    ctx.lineTo(MARGIN_X+10+location, canvas.height-MARGIN_Y-10);
    ctx.lineTo(MARGIN_X+10, canvas.height-MARGIN_Y-10);
    ctx.lineTo(MARGIN_X+10, canvas.height-MARGIN_Y-50-10);
    ctx.clip();
    // eslint-disable-next-line no-undef
    ctx.drawImage(full_bar, MARGIN_X+10, canvas.height-MARGIN_Y-50-10, 910, 50);
    ctx.restore();

    ctx.font = '28px Poppins Light';
    ctx.fillStyle = '#5A5A5A';
    let levelXPlength = ctx.measureText(` / ${compact(XP_FUNC(lvl))} XP`).width;
    let totalXPwidth = ctx.measureText(`${xp}`).width;
    ctx.fillText(` / ${compact(XP_FUNC(lvl))} XP`, canvas.width-MARGIN_X-20-levelXPlength, canvas.height-MARGIN_Y-50-27);
    ctx.fillStyle = '#C5C5C5';
    ctx.fillText(`${xp}`, canvas.width-MARGIN_X-20-levelXPlength-totalXPwidth, canvas.height-MARGIN_Y-50-27);

    ctx.font = '32px Fira Code Retina';
    let userSize = ctx.measureText(user.username);
    ctx.fillStyle = '#' + Discord.Util.resolveColor('WHITE').toString(16);
    ctx.fillText(user.username, canvas.width/2-userSize.width/2, canvas.height-MARGIN_Y-50-46);
    ctx.font = '16px Fira Code Retina';
    ctx.fillStyle = '#5A5A5A';
    let tagSize = ctx.measureText('#' + user.discriminator);
    ctx.fillText('#' + user.discriminator, canvas.width/2-tagSize.width/2, canvas.height-MARGIN_Y-50-26);

    ctx.font = '34px Poppins ExtraLight';
    ctx.fillStyle = '#FFF';
    let txtLevel = ctx.measureText('LEVEL');
    const txtLevelHeight = txtLevel.actualBoundingBoxAscent + txtLevel.actualBoundingBoxDescent;
    ctx.fillText('LEVEL', 12+MARGIN_X*2.6, MARGIN_Y*2+txtLevelHeight+10);

    ctx.font = '86px Poppins Medium';
    let level = ctx.measureText(lvl.toString());
    const levelHeight = level.actualBoundingBoxAscent + level.actualBoundingBoxDescent;
    ctx.fillText(lvl.toString(), 12+MARGIN_X*2.6+txtLevel.width/2-level.width/2, MARGIN_Y*2+txtLevelHeight+levelHeight+10+12);

    ctx.font = '34px Poppins ExtraLight';
    ctx.fillStyle = '#FFF';
    let txtRank = ctx.measureText('RANK');
    const txtRankHeight = txtRank.actualBoundingBoxAscent + txtRank.actualBoundingBoxDescent;
    // ctx.fillText('RANK', 12+MARGIN_X*2.6+txtLevel.width+55, MARGIN_Y*2+txtRank.height+10);
    ctx.fillText('RANK', canvas.width-MARGIN_X*2.6-12-txtRank.width, MARGIN_Y*2+txtRankHeight+10);

    ctx.font = '86px Poppins Medium';
    let rank = ctx.measureText(position.toString());
    const rankHeight = rank.actualBoundingBoxAscent + rank.actualBoundingBoxDescent;
    // ctx.fillText(position, 12+MARGIN_X*2.6+txtRank.width/2-rank.width/2+txtLevel.width+55, MARGIN_Y*2+txtRank.height+rank.height+10+12);
    ctx.fillText(position.toString(), canvas.width-MARGIN_X*2.6-10-txtRank.width/2-rank.width/2, MARGIN_Y*2+txtRankHeight+rankHeight+10+12);

    return canvas;
}

/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object 
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
*/
function roundRect(ctx: Canvas.CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number | any, fill: boolean, stroke: boolean) {
    if (typeof stroke === 'undefined') {
        stroke = true;
    }
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            // radius[side] = radius[side] || defaultRadius[side];
            Object.assign(radius, defaultRadius);
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
}

function compact(n: number) {
    if (n < 1000) {
        return String(n);
    } else if (n > 1000 && n < 1000000) {
        return `${parseFloat((n/1000).toFixed(2))}K`;
    } else {
        return `${n/1000000}M`;
    }
}
