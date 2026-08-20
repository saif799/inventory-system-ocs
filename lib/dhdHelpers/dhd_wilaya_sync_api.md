GETListe des wilayas actives
{{url}}/api/v1/get/wilayas

Ce point de terminaison permet de récupérer la liste des wilayas livrable par la société de livraison.
Example Request
Liste des wilayas actives
curl

curl --location -g '{{url}}/api/v1/get/wilayas'

Example Response

[
{
"wilaya_id": 1,
"wilaya_name": "Adrar"
},
{
"wilaya_id": 2,
"wilaya_name": "Chlef"
}...]

GETListe des communes actives
{{url}}/api/v1/get/communes?wilaya_id

Ce point de terminaison permet de récupérer la liste des communes livrable par la société de livraison.
AUTHORIZATIONBearer Token
Token

PARAMS
wilaya_id

Optionnel | Entre 1 et 58

example response 
{
  "0": {
    "nom": "Abadla",
    "wilaya_id": 8,
    "code_postal": "817",
    "has_stop_desk": 0
  },
  "1": {
    "nom": "Abalessa",
    "wilaya_id": 11,
    "code_postal": "1102",
    "has_stop_desk": 0
  },
  "2": {
    "nom": "Abi Youcef",
    "wilaya_id": 15,
    "code_postal": "1531",
    "has_stop_desk": 0
  },...}



  GETTarifs des prestations
{{url}}/api/v1/get/fees

Ce point de terminaison vous permet de récupérer les tarifs appliqués pour votre compte.

Seuls les wilayas active seront retourné par la requête.

Les tarifs sont appliqués séparément pour les prestations suivantes :

    Livraison (a domicile , stop desk)
    Pickup (a domicile , stop desk)
    Échange (a domicile , stop desk)
    Recouvrement (a domicile , stop desk)
    Retour (a domicile , stop desk)

 example response 
 {
  "livraison": [
    {
      "wilaya_id": 1,
      "tarif": "1300",
      "tarif_stopdesk": "900"
    },
    {
      "wilaya_id": 2,
      "tarif": "850",
      "tarif_stopdesk": "450"
    },
    {
      "wilaya_id": 3,
      "tarif": "950",
      "tarif_stopdesk": "550"
    },...],
     "echnage": [
    {
      "wilaya_id": 1,
      "tarif": "1300",
      "tarif_stopdesk": "900"
    },
    {
      "wilaya_id": 2,
      "tarif": "850",
      "tarif_stopdesk": "450"
    },
    {
      "wilaya_id": 3,
      "tarif": "950",
      "tarif_stopdesk": "550"
    },
    {
      "wilaya_id": 4,
      "tarif": "850",
      "tarif_stopdesk": "450"
    },...],
     "recouvrement": [
    {
      "wilaya_id": 1,
      "tarif": "1300",
      "tarif_stopdesk": "900"
    },
    {
      "wilaya_id": 2,
      "tarif": "850",
      "tarif_stopdesk": "450"
    },
    {
      "wilaya_id": 3,
      "tarif": "950",
      "tarif_stopdesk": "550"
    },..],...}
