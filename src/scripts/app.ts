import 'regenerator-runtime/runtime'

import "flexboxgrid";
import "../sass/main.scss";
import $ from 'cash-dom';
import Arweave from 'arweave';
import PromisePool from '@supercharge/promise-pool';
import Community from 'community-js';
import { JWKInterface } from "arweave/web/lib/wallet";

const VERSION = '1.1.0';

const arweave = Arweave.init({});
let community: Community;
let wallet: JWKInterface|'use_wallet';
let address: string;
let balance: string;
let firstAddTags: boolean = true;
let toDeploy: File[] = [];
let tags: {name: string, value: string}[] = [];
let totalSize = 0;
let fee = 0;
let total: string = '0';
let isArConnect: boolean = false;

$(document).ready(() => {
  window.addEventListener("arweaveWalletLoaded", async () => {
    try {
      // @ts-ignore
      address = await window.arweaveWallet.getActiveAddress();
      isArConnect = true;
      wallet = 'use_wallet';
      updateDropZone();
    } catch (e) {
      console.log(e);
    }
  });
  
  window.addEventListener("walletSwitch", async (e) => {
    isArConnect = true;
    address = e.detail.address;
    wallet = 'use_wallet';
    updateDropZone();
  });

  $('.tagName, .tagValue').val('');

  $('#browse').on('change', e => {
    if(!wallet) {
      doLogin(e);
      return;
    }

    addToDeploy(e);
  });

  $('body').on('click', '.arconnect', async e => {
    e.preventDefault();

    if(address && wallet) {
      try {
        // @ts-ignore
        await window.arweaveWallet.disconnect();
        window.location.reload();
      } catch (e) {
        console.log(e);
      }
    }

    try {
      // @ts-ignore
      await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION'], {
        name: 'Permaweb Dropper'
      });
      isArConnect = true;
      // @ts-ignore
      address = await window.arweaveWallet.getActiveAddress();
      wallet = 'use_wallet';
      updateDropZone();
    } catch (e) {
      console.log(e);
    }
    
  });

  $('#deploy').on('click', async e => {
    e.preventDefault();

    $('#browse').attr('disabled', 'disabled');

    if((+total) > (+balance)) {
      return alert('You don\'t have enough balance!');
    }

    tags = [];
    const $tagVal = $('.tagValue');
    $('.tagName').each((i, e) => {
      const tagName = $(e).val().toString().trim();
      const tagValue = $tagVal.eq(i).val().toString().trim();

      if(tagName.length && tagValue.length) {
        tags.push({name: tagName, value: tagValue});
      }
    });

    const $file = $('.file');
    const $cardExt = $file.find('.card-ext');

    $file.find('.status').text('Deploying (0%)...');
    $cardExt.html(ring());

    await community.setCommunityTx('eCwfEQwLFpfsfcIwbSX0l749_fsZvaYWJuSXwwDs64c');
    const target = await community.selectWeightedHolder();

    console.log(target, address, fee.toString().split('.')[0]);

    if (address !== target) {
      const tx = await arweave.createTransaction({
        target,
        quantity: fee.toString().split('.')[0],
      });
      tx.addTag('Action', 'Deploy');
      tx.addTag('Message', `Deployed ${toDeploy.length} ${toDeploy.length === 1 ? 'file' : 'files'}.`);
      tx.addTag('Service', `PermawebDropper/${VERSION}`);
      tx.addTag('App-Name', `PermawebDropper/${VERSION}`);

      await arweave.transactions.sign(tx, wallet);
      await arweave.transactions.post(tx);
    }

    await PromisePool.withConcurrency(5).for(toDeploy).process(async file => {
      await deploy(file);
      return true;
    });

    toDeploy = [];
    $('#browse').removeAttr('disabled');
  });

  $('.addTag').on('click', e => {
    e.preventDefault();

    if(firstAddTags) {
      firstAddTags = false;
      $('.tags').find('.row').show();
      return;
    }

    $('.tags').find('.row').append(`
    <div class="col-xs-6 text-center">
      <input class="tagName" type="text">
    </div>
    <div class="col-xs-6 text-center">
      <input class="tagValue" type="text">
    </div>
    `);
  });

  $('.files-container').on('click', '.remove', async e => {
    e.preventDefault();

    for(let i = 0, j = toDeploy.length; i < j; i++) {
      const file = toDeploy[i];
      const filename = file.name.replace(/ /g, '') + file.lastModified;
      
      const $file = $(e.target).parents('.file').first();
      if(filename === $file.attr('data-file')) {
        $file.remove();
        const f = toDeploy.splice(i, 1);
        totalSize -= f[0].size;
        break;
      }
    }
    if(!toDeploy.length) {
      return $('.card-footer').hide();
    }

    const {data: winston} = await arweave.api.get(`price/${totalSize}`);
    fee = (+winston) * 0.1;
    const ar = arweave.ar.winstonToAr(winston);
    const arFee = arweave.ar.winstonToAr(fee.toString());
    const total = arweave.ar.winstonToAr(((+winston) + fee).toString());

    $('.total-files').text(toDeploy.length.toString());
    $('.total-size').text(bytesForHumans(totalSize));
    $('.total-cost').text(`${ar} AR`);
    $('.total-fee').text(`${arFee} AR`);
    $('.total-cost-with-fee').text(total);
    $('.balance').text(balance);
    $('.balance-after').text(((+balance) - (+total)).toString());
  });

  $('.contact').attr('href', `${arweave.api.config.protocol}://${arweave.api.config.host}:${arweave.api.config.port}/CikNeeJibRjrRnDgyxDzH1ji66RoqXR_jkbgfcbI56w/index.html#/inbox/to=BPr7vrFduuQqqVMu_tftxsScTKUq9ke0rx4q5C9ieQU`);
});

const addToDeploy = async (e: any) => {
  let html = '';
  const files: File[] = Array.from(new Set(e.target.files));

  for(let i = files.length - 1, j = 0; i >= j; i--) {
    const file = files[i];
    const filename = file.name.replace(/ /g, '') + file.lastModified;

    if($(`[data-file="${filename}"]`).length) {
      files.splice(i, 1);
      continue;
    }

    const {data: winston} = await arweave.api.get(`price/${file.size}`);
    const ar = arweave.ar.winstonToAr(winston, {formatted: true, decimals: 5, trim: true});

    const f = file.name.split('.');

    totalSize += file.size;

    html += `
    <div class="col-xs-12 col-md-6 file" data-file="${filename}">
      <div class="card-ext row middle-xs"> 
        <div class="col-xs">${f.pop()}</div>
      </div>
      <div class="title">${f.join('.')}</div>
      <div class="description status">${bytesForHumans(file.size)} - ${ar} AR<br><a class="remove" href="#">remove</a></div>
    </div>`;
    
  }
  $('.files-container').append(html);

  toDeploy = [...toDeploy, ...files];

  const {data: winston} = await arweave.api.get(`price/${totalSize}`);
  fee = (+winston) * 0.1;
  const ar = arweave.ar.winstonToAr(winston);
  const arFee = arweave.ar.winstonToAr(fee.toString());
  total = arweave.ar.winstonToAr(((+winston) + fee).toString());

  $('.total-files').text(toDeploy.length.toString());
  $('.total-size').text(bytesForHumans(totalSize));
  $('.total-cost').text(`${ar} AR`);
  $('.total-fee').text(`${arFee} AR`);
  $('.total-cost-with-fee').text(total);
  $('.balance').text(balance);
  $('.balance-after').text(((+balance) - (+total)).toString());
  $('.card-footer').show();
};

const doLogin = (e: any) => {
  const file = e.target.files[0];
  if(!file.name.endsWith('.json')) {
    return alert('Invalid wallet file!');
  }

  const fileReader = new FileReader();
  fileReader.onload = async e => {
    try {
      // @ts-ignore
      wallet = JSON.parse(e.target.result);
      address = await arweave.wallets.jwkToAddress(wallet);
      updateDropZone();
    } catch(e) {
      console.log(e);
      alert('Invalid wallet file!');
    }
  };
  fileReader.readAsText(e.target.files[0]);
};

const deploy = async (file: File) => {
  return new Promise((resolve, reject) => {
    const filename = file.name.replace(/ /g, '') + file.lastModified;

    const fileReader = new FileReader();
      fileReader.onload = async ev => {
        const $file = $(`.file[data-file="${filename}"]`);
        const data = new Uint8Array(<ArrayBuffer>ev.target.result);
  
        if(file.name.endsWith('.json')) {
          try {
            const txt = new TextDecoder('utf8');
            const json = JSON.parse(txt.decode(data));
            if(json && json.kty === 'RSA' && json.d && json.e && json.n) {
              $file.addClass('fail');
              $file.find('.status').text('Wallet file, rejected.');
              return resolve(false);
            }
          } catch(e) {}
        }
  
        const tx = await arweave.createTransaction({ data }, wallet);

        
        for(let k = 0, l = tags.length; k < l; k++) {
          tx.addTag(tags[k].name, tags[k].value);
        }
  
        tx.addTag('Content-Type', file.type);
        tx.addTag('User-Agent', `PermawebDropper/${VERSION}`);
  
        await arweave.transactions.sign(tx, wallet);
        const txid = tx.id;

        const circle = ($file.find('circle').get(0)) as unknown as SVGCircleElement;
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference.toString();
  
        const uploader = await arweave.transactions.getUploader(tx);
        while(!uploader.isComplete) {
          await uploader.uploadChunk();
          $file.find('.status').text(`Deploying (${uploader.pctComplete}%) ...`);
          const offset = circumference - uploader.pctComplete / 100 * circumference;
          circle.style.strokeDashoffset = offset.toString();
        }
        const status = uploader.lastResponseStatus;
  
        if(status === 200 || status === 202) {
          // Success
          $file.addClass('success');
          $file.find('.status').html(`Deployed: <a href="${arweave.api.config.protocol}://${arweave.api.config.host}:${arweave.api.config.port}/${txid}" target="_blank">${txid}</a>`);
          resolve(true);
        } else {
          // Fail
          $file.addClass('fail');
          $file.find('.status').text('Transaction failed.');
          resolve(false);
        }
      }
      fileReader.readAsArrayBuffer(file);
  });
}

function bytesForHumans(bytes: number): string {
  const sizes = ['b', 'kb', 'mb', 'gb', 'tb', 'pb', 'eb'];

  let output: string;

  sizes.forEach((unit, id) => {
    const s = Math.pow(1024, id);
    let fixed = '';
    if (bytes >= s) {
      fixed = String((bytes / s).toFixed(2));
      if (fixed.indexOf('.0') === fixed.length - 2) {
        fixed = fixed.slice(0, -2);
      }
      output = `${fixed}${unit}`;
    }
  });

  if (!output) {
    return `0 Bytes`;
  }

  return output;
}

function ring() {
  return `
  <div class="col-xs">
    <svg class="progress-ring">
      <circle class="progress-ring__circle" 
        stroke="white" 
        stroke-width="4" 
        fill="transparent" 
        r="10" 
        cx="14" 
        cy="16" 
        style="stroke-dasharray: 0px 0px; 
        stroke-dashoffset: 0px;
      "></circle>
    </svg>
  </div>`;
}

async function updateDropZone() {
  const bal = await arweave.wallets.getBalance(address);
  balance = arweave.ar.winstonToAr(bal);

  const localWallet = (wallet === 'use_wallet')? await arweave.wallets.generate() : wallet;
  community = new Community(arweave, localWallet);

  const $dropzone = $('.dropzone');
  $('.tags').show();
  $dropzone.find('p').html('Drag and drop files here or <a href="#">browse for files</a>');

  $('.connection').html(`Welcome back: <strong>${address}</strong> <a href="#" class="arconnect">Logout</a>`);
}