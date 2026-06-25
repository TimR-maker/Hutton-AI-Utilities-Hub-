function pptxXmlEscape(value){
  return String(value||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]});
}

function pptxDownloadBlob(blob, filename){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
}

function pptxTextBody(existingBody, text, size){
  const bodyPr=(existingBody.match(/<a:bodyPr[\s\S]*?<\/a:bodyPr>|<a:bodyPr[^>]*\/>/)||['<a:bodyPr/>'])[0];
  const lstStyle=(existingBody.match(/<a:lstStyle[\s\S]*?<\/a:lstStyle>|<a:lstStyle[^>]*\/>/)||['<a:lstStyle/>'])[0];
  const sz=size||2200;
  const lines=String(text||'').split(/\n+/).map(function(line){
    return '<a:p><a:r><a:rPr lang="en-GB" sz="'+sz+'" dirty="0"/><a:t>'+pptxXmlEscape(line)+'</a:t></a:r><a:endParaRPr lang="en-GB" sz="'+sz+'" dirty="0"/></a:p>';
  }).join('');
  return '<p:txBody>'+bodyPr+lstStyle+lines+'</p:txBody>';
}

function pptxGetShapeById(xml, id){
  const shapes=xml.match(/<p:sp[\s\S]*?<\/p:sp>/g)||[];
  return shapes.find(function(shape){return new RegExp('<p:cNvPr[^>]*id="'+id+'"').test(shape)})||'';
}

function pptxSetShapeText(xml, id, text, size){
  const shape=pptxGetShapeById(xml,id);
  if(!shape)return xml;
  const body=(shape.match(/<p:txBody>[\s\S]*?<\/p:txBody>/)||[''])[0];
  if(!body)return xml;
  const inner=body.replace(/^<p:txBody>/,'').replace(/<\/p:txBody>$/,'');
  const next=shape.replace(body,pptxTextBody(inner,text,size));
  return xml.replace(shape,next);
}

function pptxSetShapeTextRuns(xml, id, texts){
  const shape=pptxGetShapeById(xml,id);
  if(!shape)return xml;
  const values=(Array.isArray(texts)?texts:[texts]).map(function(value){return String(value||'')});
  let index=0;
  const next=shape.replace(/<a:t>[\s\S]*?<\/a:t>/g,function(){
    const value=index<values.length?values[index]:'';
    index+=1;
    return '<a:t>'+pptxXmlEscape(value)+'</a:t>';
  });
  return xml.replace(shape,next);
}

function pptxReplaceText(xml, placeholder, text){
  const escaped=placeholder.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return xml.replace(new RegExp('<a:t>'+escaped+'</a:t>','g'),'<a:t>'+pptxXmlEscape(text)+'</a:t>');
}

function pptxClearText(xml, placeholder){
  const escaped=placeholder.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return xml.replace(new RegExp('<a:t>'+escaped+'</a:t>','g'),'<a:t></a:t>');
}

function pptxCopyShapeWithText(xmlFrom, xmlTo, sourceId, newId, text, size){
  let shape=pptxGetShapeById(xmlFrom,sourceId);
  if(!shape)return xmlTo;
  shape=shape.replace(/(<p:cNvPr[^>]*id=")\d+(")/,'$1'+newId+'$2');
  const body=(shape.match(/<p:txBody>[\s\S]*?<\/p:txBody>/)||[''])[0];
  if(body){
    const inner=body.replace(/^<p:txBody>/,'').replace(/<\/p:txBody>$/,'');
    shape=shape.replace(body,pptxTextBody(inner,text,size));
  }
  return xmlTo.replace('</p:spTree>',shape+'</p:spTree>');
}

function pptxInsertTextBox(xml, id, name, x, y, cx, cy, text, size, options){
  options=options||{};
  const fill=options.fill||'FFFFFF';
  const line=options.line||'0B2348';
  const body='<a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr><a:lstStyle/>'+String(text||'').split(/\n+/).map(function(lineText){
    return '<a:p><a:r><a:rPr lang="en-GB" sz="'+(size||1800)+'" dirty="0"/><a:t>'+pptxXmlEscape(lineText)+'</a:t></a:r><a:endParaRPr lang="en-GB" sz="'+(size||1800)+'" dirty="0"/></a:p>';
  }).join('');
  const shape='<p:sp><p:nvSpPr><p:cNvPr id="'+id+'" name="'+pptxXmlEscape(name||('TextBox '+id))+'"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="'+x+'" y="'+y+'"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="'+fill+'"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="'+line+'"/></a:solidFill></a:ln></p:spPr><p:txBody>'+body+'</p:txBody></p:sp>';
  return xml.replace('</p:spTree>',shape+'</p:spTree>');
}

function pptxCleanFilename(value, fallback){
  const name=String(value||fallback||'hutton-presentation').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return name||fallback||'hutton-presentation';
}
