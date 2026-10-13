export function compactFieldMessage(text){
 const headline=String(text).split(' · ')[0].trim();
 if(headline.length<=82)return headline;
 const end=headline.lastIndexOf(' ',79);
 return headline.slice(0,end>45?end:79)+'…';
}
export class FieldMessages{
 constructor(){this.items=[];}
 add(text){if(!text)return;this.items=this.items.filter(item=>item!==text);this.items.unshift(text);this.items.length=Math.min(6,this.items.length);}
 clear(){this.items=[];}
}
