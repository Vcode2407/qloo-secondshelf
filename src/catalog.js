// Authored demonstration stock and cultural tags. These are not Qloo data.
export const inventory = [
  ['dune','Dune','Frank Herbert','Science fiction',3,['space','discovery','politics']],
  ['martian','The Martian','Andy Weir','Science fiction',2,['space','science','humour']],
  ['earthsea','A Wizard of Earthsea','Ursula K. Le Guin','Fantasy',2,['magic','identity','journey']],
  ['hobbit','The Hobbit','J. R. R. Tolkien','Fantasy',1,['journey','friendship','magic']],
  ['prince','The Little Prince','Antoine de Saint-Exupéry','Classics',4,['space','friendship','identity']],
  ['ocean','The Ocean at the End of the Lane','Neil Gaiman','Fantasy',2,['magic','memory','identity']],
  ['omens','Good Omens','Terry Pratchett and Neil Gaiman','Fantasy',0,['humour','friendship','magic']],
  ['darkness','The Left Hand of Darkness','Ursula K. Le Guin','Science fiction',2,['space','identity','politics']],
  ['normal','Normal People','Sally Rooney','Literary fiction',1,['relationships','identity','friendship']],
  ['piranesi','Piranesi','Susanna Clarke','Fantasy',2,['discovery','memory','magic']],
  ['christie','The Murder of Roger Ackroyd','Agatha Christie','Mystery',2,['mystery','discovery','identity']],
  ['pride','Pride and Prejudice','Jane Austen','Classics',0,['relationships','humour','identity']],
].map(([id,title,author,category,availableCopies,tags]) => ({ id,title,author,category,availableCopies,tags }));

export const seeds = [
  { id:'sample-interstellar',name:'Interstellar',type:'movie',aliases:['interstellar'],tags:['space','science','discovery'] },
  { id:'sample-spirited',name:'Spirited Away',type:'movie',aliases:['spirited away','spirited'],tags:['magic','identity','journey'] },
  { id:'sample-bowie',name:'David Bowie',type:'artist',aliases:['david bowie','bowie'],tags:['space','identity','discovery'] },
  { id:'sample-taylor',name:'Taylor Swift',type:'artist',aliases:['taylor swift','taylor'],tags:['relationships','memory','identity'] },
  { id:'sample-knives',name:'Knives Out',type:'movie',aliases:['knives out'],tags:['mystery','humour','discovery'] },
  ...inventory.map(book => ({id:`sample-book-${book.id}`,name:book.title,type:'book',aliases:[book.title.toLowerCase()],tags:book.tags})),
];
