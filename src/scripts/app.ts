import "flexboxgrid";
import "../sass/main.scss";
import $ from 'cash-dom';
import Arweave from 'arweave/web';
import { JWKInterface } from "arweave/web/lib/wallet";

const VERSION = '1.1.0';

const arweave = Arweave.init({});
let wallet: JWKInterface;
let address: string;
let balance: string;
let firstAddTags: boolean = true;

$(document).ready(() => {
  $('.tagName, .tagValue').val('');

  $('#browse').on('change', e => {
    if(!wallet) {
      doLogin(e);
      return;
    }

    deployFiles(e);
  });

  $('.addTag').on('click', e => {
    e.preventDefault();

    if(firstAddTags) {
      firstAddTags = false;
      $('.tags').find('table').show();
      return;
    }

    $('.tags').find('table').append(`<tr><td><input type="text" class="tagName"></td><td><input type="text" class="tagValue"></td></tr>`);
  });

  $('.contact').attr('href', `${arweave.api.config.protocol}://${arweave.api.config.host}:${arweave.api.config.port}/CikNeeJibRjrRnDgyxDzH1ji66RoqXR_jkbgfcbI56w/index.html#/inbox/to=BPr7vrFduuQqqVMu_tftxsScTKUq9ke0rx4q5C9ieQU`);
});

const deployFiles = (e: any) => {
  let html = '';
  const files: File[] = e.target.files;
  console.log(files);

  const tags: {name: string, value: string}[] = [];
  const $tagVal = $('.tagValue');
  $('.tagName').each((i, e) => {
    const tagName = $(e).val().toString().trim();
    const tagValue = $tagVal.eq(i).val().toString().trim();

    if(tagName.length && tagValue.length) {
      tags.push({name: tagName, value: tagValue});
    }
  });

  for(let i = 0, j = files.length; i < j; i++) {
    const file = files[i];

    const filename = file.name.replace(/ /g, '') + file.lastModified;
    html += `<div class="file" data-file="${filename}">
      <span class="title">${file.name}</span>
      <div class="status">Deploying (0%) ...</div>
    </div>`;

    const fileReader = new FileReader();
    fileReader.onload = async ev => {
      const $file = $(`.file[data-file="${filename}"]`);
      const data = new Uint8Array(<ArrayBuffer>ev.target.result);

      if(file.name.endsWith('.json')) {
        try {
          const txt = new TextDecoder('utf8');
          const json = JSON.parse(txt.decode(data));
          if(json.kty === 'RSA' && json.d && json.e && json.n) {
            $file.addClass('fail');
            $file.find('.status').text('Wallet file, rejected.');
            return;
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

      const uploader = await arweave.transactions.getUploader(tx);
      while(!uploader.isComplete) {
        await uploader.uploadChunk();
        $file.find('.status').text(`Deploying (${uploader.pctComplete}%) ...`);
      }
      const status = uploader.lastResponseStatus;

      if(status === 200 || status === 202) {
        // Success
        $file.addClass('success');
        $file.find('.status').html(`Deployed: <a href="${arweave.api.config.protocol}://${arweave.api.config.host}:${arweave.api.config.port}/${txid}" target="_blank">${txid}</a>`);
      } else {
        // Fail
        $file.addClass('fail');
        $file.find('.status').text('Transaction failed.');
        console.log(e);
      }
    }
    fileReader.readAsArrayBuffer(file);
  }
  $('.files-container').prepend(html);
};

const doLogin = (e: any) => {
  const fileReader = new FileReader();
  fileReader.onload = async e => {
    // @ts-ignore
    wallet = JSON.parse(e.target.result);
    address = await arweave.wallets.jwkToAddress(wallet);
    const bal = await arweave.wallets.getBalance(address);
    balance = arweave.ar.winstonToAr(bal);

    const $dropzone = $('.dropzone');
    $('.tags').show();
    $dropzone.find('p').html('Drag and drop files here or <a href="#">browse for files</a>');
  };
  fileReader.readAsText(e.target.files[0]);
};