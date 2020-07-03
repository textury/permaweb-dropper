import "../sass/main.sass";
import $ from 'cash-dom';
import Arweave from 'arweave/web';
import { JWKInterface } from "arweave/web/lib/wallet";

const VERSION = '0.0.1';

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
      <img src="${(file.type.indexOf('image') === 0? pictureDataUri : fileDataUri)}">
      <span class="title">${file.name}</span>
      <div class="status">Deploying...</div>
    </div>`;

    const fileReader = new FileReader();
    fileReader.onload = async ev => {
      const tx = await arweave.createTransaction({data: new Uint8Array(<ArrayBuffer>ev.target.result) }, wallet);

      for(let k = 0, l = tags.length; k < l; k++) {
        tx.addTag(tags[k].name, tags[k].value);
      }

      tx.addTag('Content-Type', file.type);
      tx.addTag('User-Agent', `PermawebDropper/${VERSION}`);

      await arweave.transactions.sign(tx, wallet);
      const txid = tx.id;
      const res = await arweave.transactions.post(tx);

      const $file = $(`.file[data-file="${filename}"]`);

      if(res.status === 200 || res.status === 202) {
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
    $dropzone.find('#pass').hide();
    $dropzone.find('#water').show();
    $('.tags').show();
    $dropzone.find('h2').text('Drag and drop files here');
    $dropzone.find('a').text('Browse for files');
  };
  fileReader.readAsText(e.target.files[0]);
};

const pictureDataUri = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIwIDAgNTggNTgiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDU4IDU4OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8Zz4NCgk8cGF0aCBkPSJNNTcsNkgxQzAuNDQ4LDYsMCw2LjQ0NywwLDd2NDRjMCwwLjU1MywwLjQ0OCwxLDEsMWg1NmMwLjU1MiwwLDEtMC40NDcsMS0xVjdDNTgsNi40NDcsNTcuNTUyLDYsNTcsNnogTTU2LDUwSDJWOGg1NFY1MHoiDQoJCS8+DQoJPHBhdGggZD0iTTE2LDI4LjEzOGMzLjA3MSwwLDUuNTY5LTIuNDk4LDUuNTY5LTUuNTY4QzIxLjU2OSwxOS40OTgsMTkuMDcxLDE3LDE2LDE3cy01LjU2OSwyLjQ5OC01LjU2OSw1LjU2OQ0KCQlDMTAuNDMxLDI1LjY0LDEyLjkyOSwyOC4xMzgsMTYsMjguMTM4eiBNMTYsMTljMS45NjgsMCwzLjU2OSwxLjYwMiwzLjU2OSwzLjU2OVMxNy45NjgsMjYuMTM4LDE2LDI2LjEzOHMtMy41NjktMS42MDEtMy41NjktMy41NjgNCgkJUzE0LjAzMiwxOSwxNiwxOXoiLz4NCgk8cGF0aCBkPSJNNyw0NmMwLjIzNCwwLDAuNDctMC4wODIsMC42Ni0wLjI0OWwxNi4zMTMtMTQuMzYybDEwLjMwMiwxMC4zMDFjMC4zOTEsMC4zOTEsMS4wMjMsMC4zOTEsMS40MTQsMHMwLjM5MS0xLjAyMywwLTEuNDE0DQoJCWwtNC44MDctNC44MDdsOS4xODEtMTAuMDU0bDExLjI2MSwxMC4zMjNjMC40MDcsMC4zNzMsMS4wNCwwLjM0NSwxLjQxMy0wLjA2MmMwLjM3My0wLjQwNywwLjM0Ni0xLjA0LTAuMDYyLTEuNDEzbC0xMi0xMQ0KCQljLTAuMTk2LTAuMTc5LTAuNDU3LTAuMjY4LTAuNzItMC4yNjJjLTAuMjY1LDAuMDEyLTAuNTE1LDAuMTI5LTAuNjk0LDAuMzI1bC05Ljc5NCwxMC43MjdsLTQuNzQzLTQuNzQzDQoJCWMtMC4zNzQtMC4zNzMtMC45NzItMC4zOTItMS4zNjgtMC4wNDRMNi4zMzksNDQuMjQ5Yy0wLjQxNSwwLjM2NS0wLjQ1NSwwLjk5Ny0wLjA5LDEuNDEyQzYuNDQ3LDQ1Ljg4Niw2LjcyMyw0Niw3LDQ2eiIvPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPC9zdmc+DQo=';
const fileDataUri = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIwIDAgNjAgNjAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDYwIDYwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8Zz4NCgk8cGF0aCBkPSJNNDIuNSwyMmgtMjVjLTAuNTUyLDAtMSwwLjQ0Ny0xLDFzMC40NDgsMSwxLDFoMjVjMC41NTIsMCwxLTAuNDQ3LDEtMVM0My4wNTIsMjIsNDIuNSwyMnoiLz4NCgk8cGF0aCBkPSJNMTcuNSwxNmgxMGMwLjU1MiwwLDEtMC40NDcsMS0xcy0wLjQ0OC0xLTEtMWgtMTBjLTAuNTUyLDAtMSwwLjQ0Ny0xLDFTMTYuOTQ4LDE2LDE3LjUsMTZ6Ii8+DQoJPHBhdGggZD0iTTQyLjUsMzBoLTI1Yy0wLjU1MiwwLTEsMC40NDctMSwxczAuNDQ4LDEsMSwxaDI1YzAuNTUyLDAsMS0wLjQ0NywxLTFTNDMuMDUyLDMwLDQyLjUsMzB6Ii8+DQoJPHBhdGggZD0iTTQyLjUsMzhoLTI1Yy0wLjU1MiwwLTEsMC40NDctMSwxczAuNDQ4LDEsMSwxaDI1YzAuNTUyLDAsMS0wLjQ0NywxLTFTNDMuMDUyLDM4LDQyLjUsMzh6Ii8+DQoJPHBhdGggZD0iTTQyLjUsNDZoLTI1Yy0wLjU1MiwwLTEsMC40NDctMSwxczAuNDQ4LDEsMSwxaDI1YzAuNTUyLDAsMS0wLjQ0NywxLTFTNDMuMDUyLDQ2LDQyLjUsNDZ6Ii8+DQoJPHBhdGggZD0iTTM4LjkxNCwwSDYuNXY2MGg0N1YxNC41ODZMMzguOTE0LDB6IE0zOS41LDMuNDE0TDUwLjA4NiwxNEgzOS41VjMuNDE0eiBNOC41LDU4VjJoMjl2MTRoMTR2NDJIOC41eiIvPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPC9zdmc+DQo=';