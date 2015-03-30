"use strict";

function str2ab(str) {
  var ab = new ArrayBuffer(str.length);
  var abView = new Uint8Array(ab);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    abView[i] = str.charCodeAt(i);
  }
  return ab;
}

function buf2ab(buf) {
  var ab = new ArrayBuffer(buf.length);
  var abView = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    abView[i] = buf[i];
  }
  return ab;
}

module.exports = function(data) {

  if(Buffer.isBuffer(data)) {
    data = buf2ab(data);
  }

  if(typeof data === 'string') {
    data = str2ab(data);
  }

  if(!(data instanceof ArrayBuffer)) {
    return new Error('data should be type ArrayBuffer');
  }

  // computes CCITT CRC-16 value
  // modified from http://www.zorc.breitbandkatze.de/crc.html
  // data as ArrayBuffer

  var dataView = new DataView(data);

  var i, j, k;
  var bit, len, actchar, flag, counter, c, ch;
  var crc = new Array (8+1);
  var mask = new Array (8);
  var hexnum = new Array ("0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F");

  var order, direct, reverseDataBytes, reverseFinal;
  var polynom = new Array (8);
  var init = new Array (8);
  var xor = new Array (8);

  var reflectByte = function(inbyte) {
    // reflect one byte
    var outbyte=0;
    var i=0x01;
    var j;

    for (j=0x80; j; j>>=1) {
      if(inbyte & i) {
        outbyte|=j;
      }
      i<<=1;
    }
    return outbyte;
  };

  var reflect = function(crc, bitnum, startLSB) {
    var i, j, k, iw, jw, bit;

    // reflect 'bitnum' bits starting at lowest bit = startLSB
    for (k=0; k+startLSB<bitnum-1-k; k++) {

      iw=7-((k+startLSB)>>3);
      jw=1<<((k+startLSB)&7);
      i=7-((bitnum-1-k)>>3);
      j=1<<((bitnum-1-k)&7);

      bit = crc[iw] & jw;
      if(crc[i] & j){ crc[iw] |= jw;}
      else{ crc[iw] &= (0xff-jw);}
      if(bit) { crc[i] |= j;}
      else{ crc[i] &= (0xff-j);}
    }

    return crc;
  };

  var a2hBytes = function(input, order) {
    // convert from ascii to hexadecimal value (stored as byte sequence)
    var i, j;
    var len;
    var actchar;
    var polynom = new Array (0,0,0,0,0,0,0,0);
    var brk = new Array (-1,0,0,0,0,0,0,0);

    // convert crc value into byte sequence
    len = input.length;
    for (i=0; i < len; i++) {
      actchar = parseInt(input.charAt(i), 16);
      if(isNaN(actchar) === true) {
        return brk;
      }
      actchar &= 15;

      for(j=0; j<7; j++) {
        polynom[j] = ((polynom [j] << 4) | (polynom [j+1] >> 4)) & 255;
      }

      polynom[7] = ((polynom[7] <<4) | actchar) & 255;
    }

    // compute and check crc order
    var count = 64;
    for (i=0; i<8; i++) {
      for (j=0x80; j; j>>=1) {
        if(polynom[i] & j) {
          break;
        }
        count--;
      }
      if(polynom[i] & j) {
        break;
      }
    }

    if (count > order) {
      return brk;
    }

    return polynom;
  };

  //CCITT CRC-16
  order=16;
  polynom = a2hBytes('1021', order);
  init = a2hBytes('FFFF', order);
  xor = a2hBytes('00', order);
  direct = true;
  reverseDataBytes = true;
  reverseFinal = false;

  len=0;

  // generate bit mask
  counter = order;
  for (i=7; i>=0; i--) {
    if (counter>=8) {
      mask[i] = 255;
    } else {
      mask[i]=(1<<counter)-1;
    }
    counter -= 8;

    if(counter<0) {
      counter=0;
    }
  }

  crc = init;

  if(!direct) {    // nondirect
    crc[8] = 0;

    for (i=0; i<order; i++) {
      bit = crc[7-((order-1)>>3)] & (1<<((order-1)&7));
      for (k=0; k<8; k++) {
        crc[k] = ((crc[k] << 1) | (crc[k+1] >> 7)) & mask[k];
        if (bit) {
          crc[k]^= polynom[k];
        }
      }
    }
  }

  crc[8]=0;

  // main loop, algorithm is fast bit by bit type
  for(i=0; i<dataView.byteLength; i++) {
    c = dataView.getUint8(i);
    if(dataView.getUint8(i) === '%') {        // unescape byte by byte (%00 allowed)

      ch = parseInt(dataView.getUint8(++i), 16);

      c = parseInt(dataView.getUint8(++i), 16);

      c = (c&15) | ((ch&15)<<4);
    }

    // perform revin
    if(reverseDataBytes) {
      c = reflectByte(c);
    }

    // rotate one data byte including crcmask
    for(j=0; j<8; j++) {
      bit=0;
      if (crc[7-((order-1)>>3)] & (1<<((order-1)&7))) {
        bit=1;
      }
      if (c&0x80) {
        bit^=1;
      }
      c<<=1;
      for(k=0; k<8; k++) {   // rotate all (max.8) crc bytes
        crc[k] = ((crc[k] << 1) | (crc[k+1] >> 7)) & mask[k];
        if(bit) {
          crc[k]^= polynom[k];
        }
      }
    }

    len++;
  }

  // perform revout
  if(reverseFinal) {
    crc = reflect(crc, order, 0);
  }

  // perform xor value
  for (i=0; i<8; i++) {
    crc[i] ^= xor[i];
  }

  // write result
  var crcStr = '';

  flag=0;
  for(i=0; i<8; i++) {
    actchar = crc[i]>>4;

    if(flag || actchar) {
      crcStr = crcStr + hexnum[actchar];
      flag=1;
    }

    actchar = crc[i] & 15;
    if(flag || actchar || i===7) {
      crcStr = crcStr + hexnum[actchar];
      flag=1;
    }
  }

  return crcStr;

};
