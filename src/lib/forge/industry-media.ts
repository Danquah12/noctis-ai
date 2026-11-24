/**
 * Noctis Curated Industry Photography Module
 *
 * Supplies high-resolution, domain-matched Unsplash photography pairs layered
 * over inline SVG artwork with graceful client-side `error` fallback so cards
 * and heroes degrade cleanly offline without broken image icons.
 */

export interface ResolvedIndustryMedia {
  heroPhoto: string;
  cardPhotos: string[];
}

function u(id: string): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
}

const DOMAIN_MEDIA_BANK: Array<{ match: RegExp; hero: string; cards: string[] }> = [
  {
    match: /veterinar|pet|animal/i,
    hero: u("1548199973-03cce0bbc87b"),
    cards: [u("1587300003388-59208cc962cb"), u("1514888286974-6c03e2ca1dba"), u("1628009368231-7bb7cfcb0def")],
  },
  {
    match: /dental|orthodont/i,
    hero: u("1588776814546-1ffcf47267a5"),
    cards: [u("1606811841689-23dfddce3e95"), u("1629909613654-28e377c37b09"), u("1598256989800-fe5f95da9787")],
  },
  {
    match: /biotech|genom|pharma|trial/i,
    hero: u("1532187863486-abf9dbad1b69"),
    cards: [u("1579154204601-01588f351e67"), u("1582719471384-894fbb16e074"), u("1576086213369-97a306d36557")],
  },
  {
    match: /healthcare|clinic|medical|telehealth/i,
    hero: u("1519494026892-80bbd2d6fd0d"),
    cards: [u("1576091160399-112ba8d25d1d"), u("1584982751601-97dcc096659c"), u("1551076805-e1869033e561")],
  },
  {
    match: /solar|photovoltaic|clean\s+home\s+energy/i,
    hero: u("1509391366360-2e959784a276"),
    cards: [u("1508514177221-188b1cf16e9d"), u("1613665813446-82a78c468a1d"), u("1497440001374-f26997328c1b")],
  },
  {
    match: /travel|tourism|safari|horizon/i,
    hero: u("1469854523086-cc02fe5d8800"),
    cards: [u("1493976040374-85c8e12f0c0e"), u("1516426122078-c23e76319801"), u("1533105079780-92b9be482077")],
  },
  {
    match: /maritime|yacht|marina|sail/i,
    hero: u("1567899378494-47b22a2ae96a"),
    cards: [u("1540946485063-a40da27545f8"), u("1500514966906-fe245eea9344"), u("1569263979104-865ab7cd8d13")],
  },
  {
    match: /aviation|jet|aircraft|aerospace/i,
    hero: u("1540962351504-03099e0a754b"),
    cards: [u("1474302770737-173ee21bab63"), u("1559628233-100c798642d4"), u("1583416750470-965b2707b355")],
  },
  {
    match: /real-?estate|property|housing|coworking|workspace/i,
    hero: u("1600596542815-ffad4c1539a9"),
    cards: [u("1600585154340-be6161a56a0c"), u("1600607687939-ce8a6c25118c"), u("1497366216548-37526070297c")],
  },
  {
    match: /beauty|salon|medspa|spa|aesthetics/i,
    hero: u("1560750588-73207b1ef5b8"),
    cards: [u("1570172619644-dfd03ed5d881"), u("1522337360788-8b13dee7a37e"), u("1519823551278-64ac92734fb1")],
  },
  {
    match: /winery|vineyard|brewery|tasting/i,
    hero: u("1506377247377-2a5b3b417ebb"),
    cards: [u("1510812431401-41d2bd2722f3"), u("1568213816046-0ee1c42bd559"), u("1553361371-9b22f78e8b1d")],
  },
  {
    match: /hospitality|bakery|restaurant|coffee|bistro|dining/i,
    hero: u("1509440159596-0249088772ff"),
    cards: [u("1517248135467-4c7edcad34c4"), u("1495474472287-4d71bcdd2085"), u("1555507036-ab1f4038808a")],
  },
  {
    match: /fashion|atelier|couture|ecommerce|store/i,
    hero: u("1441986300917-64674bd600d8"),
    cards: [u("1490481651871-ab68de25d43d"), u("1460353581641-37baddab0fa2"), u("1523275335684-37898b6baf30")],
  },
  {
    match: /watchmaking|horology|luxury|jewelry|auction/i,
    hero: u("1523170335258-f5ed11844a49"),
    cards: [u("1547996160-81dfa63595aa"), u("1509048191080-d2984bad6ae5"), u("1614164185128-e4ec99c436d7")],
  },
  {
    match: /beekeeping|apiary|honey|agricult|farm/i,
    hero: u("1500937386664-56d1dfef3854"),
    cards: [u("1558642452-9d2a7deb7f62"), u("1464226184884-fa280b87c399"), u("1574943320219-553eb213f72d")],
  },
  {
    match: /automotive|motors|vehicle/i,
    hero: u("1503376780353-7e6692767b70"),
    cards: [u("1552519507-da3b142c6e3d"), u("1549399542-7e3f8b79c341"), u("1619642751034-765dfdf7c58e")],
  },
  {
    match: /construction|architecture|home\s+services|interior/i,
    hero: u("1503387762-592deb58ef4e"),
    cards: [u("1541888946425-d81bb19240f5"), u("1618221195710-dd6b41faaea6"), u("1581094794329-c8112a89af12")],
  },
  {
    match: /fitness|yoga|pilates|sports|athletics/i,
    hero: u("1534438327276-14e5300c3a48"),
    cards: [u("1518611012118-696072aa579a"), u("1571019614242-c5c5dee9f50b"), u("1541534741688-6078c6bfb5c5")],
  },
  {
    match: /education|montessori|childcare|academy|bookstore|library/i,
    hero: u("1524995997946-a1c2e315a42f"),
    cards: [u("1523240795612-9a054b0db644"), u("1503676260728-1c00da094a0b"), u("1481627834876-b7833e8f5570")],
  },
  {
    match: /legal|law|accounting|cpa|banking|fintech/i,
    hero: u("1486406146926-c627a92ad1ab"),
    cards: [u("1589829545856-d10d557cf95f"), u("1454165804606-c3d57bc86b40"), u("1554224155-6726b3ff858f")],
  },
  {
    match: /wedding|photography|events|conference|music|podcast|entertainment/i,
    hero: u("1511578314322-379afb476865"),
    cards: [u("1519741497674-611481863552"), u("1501281668745-f7f57925c3b4"), u("1598488035139-bdbb2231ce04")],
  },
  {
    match: /cyber|saas|ai|admin|crm|erp|telecom|manufacturing|robotics|grid|mining|defense/i,
    hero: u("1550751827-4bd374c3f58b"),
    cards: [u("1518770660439-4636190af475"), u("1551288049-bebda4e38f71"), u("1451187580459-43490279c0fa")],
  },
];

const MOTIF_FALLBACK_MEDIA: Record<string, { hero: string; cards: string[] }> = {
  waves: {
    hero: u("1507525428034-b723cf961d3e"),
    cards: [u("1469854523086-cc02fe5d8800"), u("1500514966906-fe245eea9344"), u("1501785888041-af3ef285b470")],
  },
  peaks: {
    hero: u("1464822759023-fed622ff2c3b"),
    cards: [u("1519681393784-d120267933ba"), u("1454496522488-7a8e488e8606"), u("1506905925346-21bda4d32df4")],
  },
  blueprint: {
    hero: u("1486406146926-c627a92ad1ab"),
    cards: [u("1503387762-592deb58ef4e"), u("1497366216548-37526070297c"), u("1600585154340-be6161a56a0c")],
  },
  organic: {
    hero: u("1441974231531-c6227db76b6e"),
    cards: [u("1500937386664-56d1dfef3854"), u("1464226184884-fa280b87c399"), u("1509391366360-2e959784a276")],
  },
  circuit: {
    hero: u("1518770660439-4636190af475"),
    cards: [u("1550751827-4bd374c3f58b"), u("1551288049-bebda4e38f71"), u("1451187580459-43490279c0fa")],
  },
  luxury: {
    hero: u("1523170335258-f5ed11844a49"),
    cards: [u("1441986300917-64674bd600d8"), u("1490481651871-ab68de25d43d"), u("1510812431401-41d2bd2722f3")],
  },
  clinical: {
    hero: u("1519494026892-80bbd2d6fd0d"),
    cards: [u("1576091160399-112ba8d25d1d"), u("1588776814546-1ffcf47267a5"), u("1532187863486-abf9dbad1b69")],
  },
  editorial: {
    hero: u("1497366811353-6870744d04b2"),
    cards: [u("1497215728101-856f4ea42174"), u("1522071820081-009f0129c71c"), u("1454165804606-c3d57bc86b40")],
  },
};

export function resolveIndustryMedia(
  categorySlug: string,
  industrySpecialty: string,
  visualMotif: string,
): ResolvedIndustryMedia {
  const hay = `${categorySlug} ${industrySpecialty}`.toLowerCase();
  const hit = DOMAIN_MEDIA_BANK.find((entry) => entry.match.test(hay));
  if (hit) {
    return { heroPhoto: hit.hero, cardPhotos: hit.cards };
  }
  const fb = MOTIF_FALLBACK_MEDIA[visualMotif] || MOTIF_FALLBACK_MEDIA.editorial!;
  return { heroPhoto: fb.hero, cardPhotos: fb.cards };
}
