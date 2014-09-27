/**
 * Created by Theadd on 7/26/14.
 */

var TrackerClient = require('bittorrent-tracker')
var rawAnnounceItem = {'requests': 0, 'responses': 0, 'timeouts': 0, 'last-request': new Date().getTime() }

var blacklistPatterns = [
// Idiots
  'torrage.com',
  'zoink.it',
  '/scrape',
// TPB
  'thepiratebay',
  'piratebay.',
  '.prq.to/',
  '.prq.to:',
  'p://217.75.120.',
  'p://83.140.',
  'p://85.17.40.',
  'p://77.247.176.',
  'p://91.191.138.',
  'p://192.121.86.',
// Manual
  'moviex.info',
  'tracker.torrent.to',
  'tracker.zerotracker.com',
  'tk2.greedland.net',
  'tracker.bitcomet.net',
  'tracker.bt-chat.com',
  'tracker.ydy.com',
  'www.torrentrealm.com',
// DNS Errors
  '100-percent-dvd.ath.cx',
  'a-classic.dragoneye.ca',
  'a4y.netaiwan.com',
  'acidflux.ath.cx',
  'any.crystalnova.net',
  'assetz.dns2go.com',
  'assetz.dns2go.com',
  'attica.shyper.com',
  'bitfrozen.mybesthost.com',
  'blasphemous.no-ip.org',
  'braincylinder.net',
  'bt.lanspirit.net',
  'btracker.myip.us',
  'clandest1.blogdns.org',
  'cuf.ath.cx',
  'dammkar.dyndns.org',
  'dc.flamevault.com',
  'deadbanger.homeip.net',
  'denis.stalker.h3q',
  'dolphingod.homeip.net',
  'dopetracker.ath.cx',
  'dopetracker.shacknet.nu',
  'e-xtreme.ath.cx',
  'fastloads.ddns.me.uk',
  'george.mopoke.co.uk',
  'gigatorrents.ath.cx',
  'hunted1.mancu.org',
  'josefinefan.dyndns.org',
  'k-neko.info',
  'lastorrent.zapto.org',
  'magikseeder.dyndns.org',
  'manga-fiends.kicks-ass.net',
  'mongo56.mine.nu',
  'music-videos.zapto.org',
  'mustracker.tbmoscow.ru',
  'open-tracker.ath.cx',
  'otg.homedns.org',
  'privatemovieworld.com',
  'ratiofree.com',
  's93054240.onlinehome.us',
  'stuff.dnsdojo.com',
  'sukamedeek.wtf.la',
  'tf-tracker.mine.nu',
  'torrent.desireactor.com',
  'torresmobtt.dyndns.org',
  'torrstream.com',
  'tracker-b.digital-update.com',
  'tracker-btc-net.dnsdojo.org',
  'tracker-menace.ItemDB.com',
  'tracker.bunglefever.com',
  'tracker.ishtar.ca',
  'tracker.mufftorrent.com',
  'tracker.torrent-force.com',
  'tracker.umt.pl',
  'tracker2.punktorrents.com',
  'tracker4.bol.bg',
  'tracker421.gotdns.org',
  'tracker5.zcultfm.com',
  'trackerhe11bit.getmyip.com',
  'wtf2004.bounceme.net',
  'www.adictobt.net',
  'www.at.trancetraffic.com',
  'www.camfrog-paradise.fr',
  'www.donlilo.com',
  'www.f-cksega2.com',
  'www.g-s-online.org',
  'www.hawkies-one.com',
  'www.mvgroup.org.2710',
  'www.supremetorrents.co.uk',
  'www.torrent-core.com',
  'www.torrent.downloads.to',
  'www.zone2u.net',
  'yahaa.no-ip.org',
  'animetsuki.ath.cx',
  'bitseeker.sixth.biz',
  'box.chapter59.com',
  'bretsatan.is-a-geek.com',
  'bt.ampx.net',
  'bt.diva.ro',
  'bt3.shinsen-subs.be',
  'btwasteland.optus.nu',
  'bunko.theppn.org',
  'code9-kicks-ass.net',
  'dataocean.hopto.org',
  'degrassitorrents.ath.cx',
  'dyntrac.cable.nu',
  'e-xtreme-tracker.ath.cx',
  'football.hn.org',
  'italodance.freesuperhost.com',
  'juani.colirioteam.com.ar',
  'jungletorrents.bounceme.net',
  'justtheboss.dyndns.org',
  'kandyland.dnsalias.net',
  'mame.zapto.org',
  'mizugi.nihon07.es',
  'moviestogo.purehype.net',
  'murfy.dyndns.tv',
  'mysticblue.kicks-ass.org',
  'poseidon.net-addicts.net',
  'royalpalace.ath.cx',
  'slofs-tracker.org',
  'sm-tracker.no-ip.org',
  'souncazzo.altervista.org',
  'space.bscn.com',
  'sumotracker.better-than.tv',
  'tamilmp3site.net',
  'torrents.colirioteam.com.ar',
  'torrents.zaeleus.org',
  'torrentxecution.com',
  'tracker.morkedcram.com',
  'tracker.torrentsrus.co.uk',
  'tracker.unrealmac.com',
  'tracker1.tvtorrents.net',
  'tracker3.zcultfm.com',
  'tracker4.tvtorrents.net',
  'tracker4usall.dyndns.org',
  'tracker5.tvtorrents.net',
  'unrealbittorrents.dnsdojo.com',
  'users.cwi.hu',
  'vip-the-piratebay.homelinux.com',
  'www.0daybrasil.com',
  'www.designs.ravenzoth.com',
  'www.free4fun.org',
  'www.inforlinea.com',
  'www.speed-palace.de',
  'www.storage-dump.biz',
  'www.super-torrents.co.uk',
  'www.team-undertaker7030.net',
  'www.torrents4ever.info',
  'www.tracker.steadyhosting.co.uk',
  '1.tk.btcomic.h3q.com',
  'Hentai-Legacy-BT.dyndns.org',
  'Sp33d.myZ.info',
  'bittorrentfiles.ath.cx',
  'bt.21dx.com',
  'bt.cnmmm.com',
  'bt.nanashi.thedune.ru',
  'e1cd71a748b77ed7efee0a99269cd0abb68ffd35.bthub.com',
  'jenwood.net',
  'kronick.is-a-chef.org',
  'letitburn.titrenium.com',
  'madtracker.advancenetworking.com',
  'novatorrents.dyn.pl',
  'predator2004.ath.cx',
  'rl-tracker.dyndns.org',
  'seedertrack.mydyn.net',
  'tarcker.toptorrent.org',
  'thistorrent.kicks-ass.net',
  'titmouse.gentoo.org',
  'torrential.kicks-ass.net',
  'torrents.pornmovietorrents.info',
  'tracker.audiofarm.cc',
  'tracker.indymedia.org',
  'tracker.ip-cloak.com',
  'tracker2.tvtorrents.net',
  'trackerfree.dyndns.org',
  'trackerw.sytes.net.violation.noiptos.com',
  'www.bigbrotherfans.org',
  'www.darkobox.com',
  'www.ratsheaven.com',
  'www.riojatracker.com',
  'www.team-influx.com',
  'www.wetspunk.net',
  'www.zccustoms.net',
  'zcultfm4.no-ip.org',
  'zionteam.ultrahost.pl',
  'asgaard.area11.net',
  'blackcat.kicks-ass.net',
  'bt.miriamyeung.com.tw',
  'bt.netshowbbs.com',
  'bt.sumisora.com',
  'captian.shacknet.nu',
  'cddvdseeder.com',
  'coxy1987.kicks-ass.org',
  'designs.ravenzoth.com',
  'mininova.hacked.in',
  'mininova.strangled.net',
  'niteshdw.dyndns.org',
  'oandafiles.com',
  'oasis.bscn.com',
  'pokermovieworld.com',
  'rl-tracker1.dyndns.org',
  'tamilp2p.com',
  'tiredsradio.dyndns.org',
  'torrent.chelloo.com',
  'torrentrealm.dyndns.org',
  'tracker.anirev.net',
  'tracker.binural.ru',
  'tracker.emperortorrents.com',
  'tracker.majin2007.com',
  'tracker.rorikon.net',
  'tracker.traasje.nl',
  'tracker2.mufftorrent.com',
  'trackertdt.podzone.net',
  'www.golden-torrent.info',
  'www.myomegatracker.com',
  'www.newnova.org',
  'www.tracker-mp3.fr',
  'www.xgab.ca',
  'asgaard.server.us',
  'btcyberstorm.sytes.net',
  'exeem.to',
  'eztorrents.scrapping.cc',
  'fileagency.ath.cx',
  'fileagency.cable.nu',
  'hifi-torrents.serveftp.com',
  'justtorrents.gr8domain.biz',
  'kenny.my3website.net',
  'larktorrents.dyndns.org',
  'madmaster.hopto.org',
  'midnightcabbie.com',
  'prime-ports.info',
  'riverrhine.homelinux.net',
  'shardtorrents.no-ip.org',
  'snarfbt.shacknet.nu',
  'torentfiend.ath.cx',
  'torrents.credit4repair.net',
  'torz.repairscredit.net',
  'tracker.casonova.org',
  'tracker.de-bruin.net',
  'tracker.devilz-crew.org',
  'tracker.dontexist.com',
  'tracker.nwfr-board.org',
  'tracker0.bol.bg',
  'tracker1.bol.bg',
  'tracker2.ktxp.com',
  'www.elitenova.net',
  'www.lucky-tracker.com',
  'www.must-suck.net',
  'www.reputationrebel.org',
  'www.seederheaven.co.uk',
  'aplustorrents.qHigh.com',
  'b00b.blogdns.net',
  'bt.heha.org',
  'cheesemuffin.podzone.net',
  'crazymazeys.kicks-ass.org',
  'e1.ath.cx',
  'energiebox.no-ip.biz',
  'freelikeiwanttobe.dynalias.net',
  'site.tuxwarez.info',
  'speedtorrents.tv',
  'thedaddyman.no-ip.info',
  'torrent-zone.ath.cx',
  'torrentit.mine.nu',
  'torrentum.longmusic.com',
  'tracker.fallen-angel.dyndns.org',
  'tracker.niteshdw.com',
  'tracker.prq.t80',
  'trackerN.zcultfm.com',
  'www.3realms-torrents.net',
  'www.animex.be',
  'www.ar3a51.org',
  'www.digitaltv.bwayne.net',
  'www.killerzone-torrents.org',
  'www.pbnova.us',
  'blackcats.myftp.org',
  'bt.iqcrew.net',
  'cooltrack.no-ip.org.violation.noiptos.com',
  'dark-rebells.ath.cx',
  'ddaimaku.no-ip.info',
  'frankyflip.dnyp.com',
  'kraytracker.pwner.info',
  'luclin.bscn.com',
  'nevelover.free.fr',
  'peteparker.redirectme.net',
  'planet-of-torrent.no-ip.biz',
  'premiumscene.org',
  'torrent-baba.ath.cx',
  'torrents.ebrain.com.br',
  'tracker.freshtorrentz.com',
  'tracker.r3v3ng.net',
  'tracker1.zcultfm.com',
  'tracker4.zcultfm.com',
  'united-nation.ath.cx',
  'www.future-tracker.de',
  'www.kurau.info',
  'www.numpski.co.uk',
  'www.wareztotal.com',
  'atlantis-stargate.no-ip.info',
  'bit-bytes.co.uk',
  'coptang.hn.org',
  'cp-bt-track2.from-tx.com',
  'ddram.kicks-ass.org',
  'dont.make-crack.info',
  'eldirnet.no-ip.info',
  'elite-team.blogdns.net',
  'elmo.emaraties.net',
  'final-bits.ath.cx',
  'mp3powa.is-a-chef.com',
  'pornobits.se',
  'servitude.mypets.ws',
  'todotorrente.net',
  'torrent-downloads.shacknet.nu',
  'torrenttrader.zapto.org',
  'wardencliffe.mine.nu',
  'www.scenezone.net',
  'bittorrent.cruise247.net',
  'btit.ceramic.es',
  'ozone-torrents.net',
  'qload-torrentz.epac.to',
  'starfiret.vicp.net',
  'torrentit.shacknet.nu',
  'torrentpirates.org',
  'torrentvalley.servebbs.org',
  'tracker5.bol.bg',
  'www.exeem.to',
  'www.pornobits.se',
  'www.scifi-classics.net',
  'www.yahaa.info',
  'xbttest.dvdquorum.es',
  'animeiji.fansub.org',
  'bt.nerae.com',
  'bt.so-ga.com',
  'btr.myvnc.com',
  'conspiracy.hopto.org',
  'downloadin.wtf.la',
  'hkp2p.homeip.net',
  'sierra117',
  'tc.cyber-planet.org',
  'torrent.autopatcher5.mirror.ineedhosting.net',
  'torrentuniverse.mine.nu',
  'tracker.slax0rz.net',
  'tracker1.homeip.net',
  'tstracker.no-ip.org',
  'wander.thruhere.net',
  'www.scrapcomputers.busydizzys.com',
  'www.torrentbr.org',
  'asgaard.to',
  'bittorrent.anime-supreme.com',
  'bt.leoboard.com',
  'filehunt.wikaba.com',
  'frankyflip.dynamic-dns.net',
  'fulltransfers.cockeyed.com',
  'inferno-demonoid.servebbs.com',
  'prototype24.ath.cx',
  'smk.rapidspace.com',
  'torrent.podzone.org',
  'torrent.raq2.com',
  'tracker.hightorrent.to',
  'tracker.odigopl.dlk.pl',
  'tracker2.reprobate.se',
  'uk-tracker.bol.bg',
  'www.infohash.net',
  'www.wwtorrents.net',
  'bt.joyyang.com',
  'bt.zingking',
  'forum.digimonhimitsu.com',
  'geo.bbtt.tv',
  'h732605.serverkompetenz.net',
  'lightningspeed.info',
  'psychotorrents.com',
  'rotorrentmania.lx.ro',
  'teamapex.myftp.org',
  'torrents.onlinepharmacy1234.com',
  'tracker.area51.org.il',
  'tracker.bitstop.to',
  'tracker.malomania.com.ar',
  'tracker.rainbowfc.com',
  'tracker.requiem-storm.com',
  'www.badgerworld.org',
  'www.bb-torrents.net',
  'www.dataloretracker.com',
  'www.maxi-team.net',
  'anime-legion.elandal.org',
  'books.no-ip.org',
  'bt3.uglab.org',
  'bytepusher.info',
  'champ2220.dyndns.biz',
  'minipirate.eliteguild.info',
  'pt-is-the-biz.com',
  'torrent.hetetieners.eu',
  'tracker.meganova.org',
  'warezxploit.org',
  'welltech.ath.cx',
  'wollnik.homeip.net',
  'www.larktorrents.info',
  'a-bt.ath.cx',
  'abetterplace2b.biz',
  'dc-scene.wrzhost.com',
  'jonnyfavorite.servebeer.com',
  'sladinki007.eu',
  'smokin.indoserver.org',
  't.arminter.net',
  'thisisanopentracker.com',
  'tracker-torrentbox.is-a-geek.com',
  'verkemer.ath.cx',
  'www.gravesilent.net',
  'www.reload-tracker.net',
  'bt.luao.net',
  'bt.luao.net',
  'chaos-wasteland.dyndns.org',
  'dromedatracker.sytes.net',
  'rl-tracker.2mydns.com',
  'seed-freak.org',
  'seedorbleed.org',
  'tracker-zerotracker.servebbs.com',
  'tracker.bakadownloads.com',
  'tracker.hknd.com',
  'tracker.homeunix.net',
  'tracker.packy.se',
  'bittorrenttracker.org',
  'bt3.eastgame.net',
  'easydl.fabolo.us',
  'gate-2-paradies-city.mine.nu',
  'krackerjack.servegame.org',
  'miriamyeung.com.tw',
  'pirateazy.org',
  'show.no-ip.org',
  'thezone.scrapping.cc',
  'tracker.btjunkie.org',
  'tracker.manga-ton1x.net',
  'www.adriandaz.host.sk',
  'www.scifitorrents.x8web.com',
  '61.175.209.125.6969',
  'dragon-torrent-world.biz',
  'dvdseeders.gotdns.org',
  'tracker.cartoon-world.org',
  'tracker.polskie-torrenty.pl',
  'www.fuzionteam.net',
  'www.nonuspoker.info',
  'www.spiricomtracks.net',
  'bit-torrents.ath.cx',
  'bt2.eastgame.net',
  'eztvisladinki007.shacknet.nu',
  'flasxitracker.mine.nu',
  'makavelli2003.gotdns.com',
  'nonstopdirekt.servebbs.com',
  'torrent.pills-diets.com',
  'tracker.hetetieners.eu',
  'tracker1.rainbowfc.com',
  'viewtrackerz.merseine.nu',
  'www.cooltorrents.com',
  'www.darks-torrent-world.goldentorrent.net',
  'www.thespongeclub.net',
  'beta.thathustle.com',
  'bt.055.cn',
  'flux-tracker.mine.nu',
  'midnightbits.xxuz.com',
  'minidix.fbi.be',
  'smartorrent.dvrdns.org',
  'torrent-hackers.co.uk',
  'tracker.so-ga.com',
  'waretree.org',
  'www.demonicsouls.net',
  'www.devil-tracker.net',
  'www.dinmamma.be',
  'www.srilankaw-bt.org',
  'zerotracker.servegame.org',
  'azurean-logic.net',
  'bt-tracker.mine.nu',
  'gshk.happy-host.com',
  'perpetualnight-tracker-2.no-ip.info',
  'teamfx.no-ip.org',
  'torrent.potorro.com',
  'tracker.starteamfansub.net',
  'www.ugstorrents.net',
  'appleguru.dyndns.org',
  'www.consoleheaven.in',
  'alphaport-networks.com',
  'bt.yhcmovie.com',
  'driv.dyndns.biz',
  'hth-tracker.mine.nu',
  'public.torrent-kingdom.net',
  'tracker.prg.to',
  'tus.sladinki007.eu',
  'animephobia.bizarre-host.com',
  'torrent.lag.in',
  'tracker.desitirrebts.com',
  'www.torrentmafia.info',
  'torrentq.thecredit-scores.com',
  'tracker.tbfiles.org',
  'www.blackstarbt.co.uk',
  'bit-evolution.ath.cx',
  'latinotorrent.com',
  'www.azureusworld.com',
  'baulwarez.ath.cx',
  'mega-loads.biz',
  'suprnova.dyndns.org',
  'torrent-comet.club-23.org',
  'waretree.homedns.org',
  'when.pigscanfly.ca',
  'www.clawtorrents.org',
  'www.gangters.be',
  'www.genei-ryodan.cl',
  'www.torrentsyndrome.com',
  'www.torrentsyndrome.com',
  'xxxtorrent.kicks-ass.net',
  'bt.itbbs.net',
  'bt.newmov.com',
  'mpaa.servehttp.com',
  'ripper.dnsdojo.net',
  'tracker.stfu.ca',
  'www.3rdrev.com',
  'only-guiness.servebeer.com',
  'speedtracker.lightcast.tv',
  'tpb.tracker.pqr.to',
  'tracker.shadowtech.biz',
  'www.pn5.epac.to',
  'bridged-networks.org',
  'hollybytes.com',
  'newtorrent.apocalypsenet.net',
  'newtorrents.shacknet.nu',
  'shaka.servebbs.com',
  'spirit-of-torrents.redirectme.net',
  'torrents.autos-loans.net',
  'tracker.workisboring.com',
  'bittorment.oCry.com',
  'bt.mindwerks.net',
  'file-world.net',
  'perpetualnight-tracker-3.no-ip.org',
  'tracker.spartacuslives.org',
  'www.giga-bitz.org',
  'www.ugstorrents.com',
  'golinux.co.il',
  'madcow.sytes.net',
  'skyland.sytes.net',
  'www.supaboards.co.uk',
  'www.torrentmx.org',
  'www.yikuai.com',
  'btt.myvnc.com',
  'queuezilla.net',
  'tracker.playtunes.net',
  'arbor.bounceme.net',
  'eztv.kicks-ass.org',
  'farmlyte.tv',
  'tracker.dvdmenubacks.com',
  'tracker.losslessone.org',
  'www.kompletly.com',
  'bt4.eastgame.net',
  'hipostfiles.net',
  'myfusion.no-ip.biz',
  'torrentsunami.mine.nu',
  'ukisok.servehttp.com',
  'www.trackback.ath.cx',
  'bt2.92wy.com',
  'ourfile.163.com',
  'trackera.zcultfm.com',
  'www.tracker.torrentportal.com',
  'estandardtracker.com',
  '17yy.com',
  'agent99.servebbs.net',
  'darkerbytes.org',
  'moviesb4time.info',
  'bt.f234.com',
  'pc5.knoppix-unet.ocn.ne.jp',
  'www.billymck.co.uk',
  '2old2r-r.no-ip.org',
  'matterik.getmyip.com',
  'publictracker.info',
  'sot.kicks-ass.org',
  'bt.yikuai.com',
  'champ1.dyndns.biz',
  'dontcha-generation.no-ip.biz',
  'tracker.mundo-anime.org',
  'www.console-delight.co.uk',
  'sors-tracker.depthstrike.com',
  'superusenet.no-ip.info.violation.noiptos.com',
  'taelva.awardspace.com',
  'www.torrents4us.com',
  'darmeth.ath.cx',
  'yahaaer.dyndns.org',
  'campodelturia.awardspace.com',
  'sharkattacktorrents.shacknet.nu',
  'toylet.homeip.net',
  'devilz-crew.dyndns.org',
  'twighlight-zone.ath.cx',
  'btbypass.edwardk.info',
  'torrents.shexnet.com',
  'tracker.sharetv.org',
  'vtv.sladinki007.eu',
  'bttracker.game.vtc.vn',
  'p2pworld.ulmb.com',
  'princes-of-darkness.redirectme.net',
  'trackersurfer.fr',
  'yahaa.info',
  'bttracker.servebeer.com',
  'novatelbt.net',
  'alchemyrg.sladinki007.net',
  'cyberseeders.ath.cx',
  'deadbeats.acreditrepair.net',
  'smirky.wtf.la',
  'torrents.cashloans247.net',
  'tracker.holyplanets.com',
  'bt1.maopian.com',
  'conspiracycentralx.net',
  'tc-alt.ath.cx',
  'www.sstorrents.co.uk',
  'eazygrab.myftp.org',
  'www.certcity.net',
  'torrent-delight.co.uk',
  'tracker3.digital-update.com',
  '2do4u2.com',
  'eztv2.sladinki007.eu',
  'fin-ii.no-ip.org',
  'matchfile.biz',
  'realable.net',
  'darmeth.kicks-ass.net',
  'trackern.zcultfm.com',
  'booya.fullcontactzone.com',
  'www.cp.torrentbr.org',
  'rl-tracker.2mydns.org',
  'sors-tracker.enlist-a-distro.net',
  'trackerhellbit.podzone.net',
  'www.gobbles-swamp.net',
  'the-snake-pit.co.uk',
  'www.thugracing.com',
  'darksiderg.sladinki007.net',
  'hstorrents.com',
  'alt.team-undertaker7030.net',
  'b00bs.hobby-site.com',
  'torrent.the-creditscore.com',
  'tracker1.digital-update.com',
  'porntracker.no-ip.org',
  'torrents.aphonevoip.com',
  'tracker.digital-corruption.net',
  'dragon-temple.ath.cx',
  'tracker.net-addicts.net',
  'xtorrent.xgab.ca',
  'filehouse.scrapping.cc',
  'torrent1.voip22.net',
  'destroshouse.com',
  'torrents.car2loan.net',
  'www.d-mworld.com',
  'bt.hkserver.org',
  'cyberfun-tracker-001.cyberfun.ro',
  'tracker.torobt.com.ar',
  'tracker2.anirena.com',
  'www.tk80.net',
  'blackcats.filesoup.com',
  'lords-of-darkness.redirectme.net',
  'minitalk.no-ip.org',
  'onii-chan.ath.cx',
  'tzt.ath.cx',
  'tracker2.lokitorrent.com',
  'www.doctorwhotorrents.com',
  'bt1.ali213.net',
  'tracker.mundovob.eu',
  'treehorn.mine.nu',
  'bt.lhvod.com',
  'tracker.ycbt.com',
  'btbtbt.vicp.net',
  'www.power-generation.biz',
  'hpd-crew.homeftp.net',
  'rl-tracker.no-ip.org',
  'bt.51soft.com',
  'gremlinslair.ath.cx',
  'thespongeclub.net',
  'tracker.hot-cell.org',
  'tracker.kaicn.com',
  'bt.chinabtbbt.com',
  'montel.isa-geek.org',
  'jedi.sladinki007.eu',
  'www.mediatorrents.org',
  'boyz.selfip.com',
  'pnyxtr.b33r.net',
  'buccaneer.boldlygoingnowhere.org',
  'minitalk.net',
  'sstorrents.co.uk',
  'bittown.ath.cx',
  'tracker.metrotorrents.info',
  'trackerb.zcultfm.com',
  'blackspeed.mine.nu',
  'pron-now.no-ip.org',
  'bt.newwise.com',
  'serenity.xtc.tc',
  'www.torrent-delight.co.uk',
  'bt.ppxbbs.com',
  'tracker.92wy.com',
  'www.mgatorrents.co.uk',
  'trackerB.zcultfm.com',
  'tracker.so-ga.net',
  'coretracker.no-ip.org',
  'teamfx.kicks-ass.org',
  'ticose.no-ip.org',
  'hockeyphan.mine.nu',
  'tk.chinapsp.net',
  'hellraiserrg.sladinki007.eu',
  'fire-reloaded.ath.cx',
  'spankys.game-server.cc',
  'tp-tracker.ath.cx',
  'bt.skke.net',
  'hollywoodst4u.com',
  'wdb-group-tracker.ath.cx',
  'musicandvideo.myftpsite.net',
  'musicandvideo.myftpsite.net',
  'best-of-torrent.ath.cx',
  'phantombitz.info',
  'bt2.uglab.org',
  'alt.d-t-d.cc',
  'the.nwotracker.info',
  'torrent-space.hopto.org',
  'tracker-a.digital-update.com',
  'mongo56.souptracker.com',
  'tracker.hkorz.com',
  'arktos.ath.cx',
  'sabre-torrents.com',
  'tracker.freaktorrent.net',
  'bt.ydy.com',
  'www.torrentwallpaper.com',
  'downloadpublic.myphotos.cc',
  'tr.ydy.com',
  'tracker.lokitorrent.com',
  'bt.uglab.org',
  'altimit-dev.net',
  'inp2p.247freeringtone.net',
  'www.tracker.torrentspain.com',
  'torrents.a2buyxanax.com',
  'bt.chdtv.net',
  'ww.legittorrents.info',
  'torrents.a-creditrepair.net',
  'molinezja.ota.pl',
  'speed-of-torrents.ath.cx',
  'taelva.no-ip.org',
  'bt.no-sekai.de',
  'tracker.danomac.org',
  'tvnihon.dragoneye.ca',
  'odyssey.acreditrepair2001.com',
  'torrentdealer.mine.nu',
  'ut-tracker.biz',
  'torrent-force.mine.nu',
  'ds-empire.ath.cx',
  'torrential.kicks-ass.org',
  'lossless.servehttp.com',
  'tracker2.rpgtechnologies.com',
  'bt.kaicn.com',
  'www.trackerhellbit.com',
  'homergrown.is-a-chef.com',
  'torrential.dontexist.org',
  'tracker.sladinki007.eu',
  'www.flushtorrents.com',
  'kaffee-wellblech.no-ip.info',
  'ripper.dyn-o-saur.com',
  'localhost',
  'ddong.mine.nu',
  'ddram.kicks-ass.net',
  'bt.ahcomic.com',
  'seedy.mine.nu',
  'boorstar.org',
  'www.xxxforyou.org',
  'bt.zingking.com',
  'rock.sladinki007.eu',
  'tracker.idesir.com',
  'kakburk.ath.cx',
  'bt.btren.net',
  'byteshop.alrocks.com',
  'torrent-dimension.ath.cx',
  'ijerked.it',
  'saturn.merseine.nu',
  'souptracker.eggdrop.bz',
  'bitpirates-tracker.ath.cx',
  'b3st.b33r.net',
  'midnightbits.boxbsd.com',
  'l-f-t.no-ip.org',
  'opentracker1.rarbg.com',
  'torrent-kingdom.net',
  'eztv2.sladinki007.net',
  'pn5.epac.to',
  'hurcules.serveftp.net',
  'trackerA.zcultfm.com',
  'tracker9.bol.bg',
  'helltorrent.no-ip.biz',
  'modernmodem.no-ip.org',
  'bt.cn5566.com',
  'helltorrent.selfip.net',
  'tunebully.com',
  'tracker.ppnow.com',
  'torrentdealer.ath.cx',
  'tracker.piecesnbits.net',
  'www.ebookvortex.com',
  'empire-of-torrents.hopto.org',
  'bimonscificon.mybttracker.net',
  'my.tracker',
  'tracker.torrentlounge.com',
  'www.ultimate-bit-board.to',
  'tracker.udp.at',
  'bt.cnxp.com',
  'www.minitalk.net',
  'tracker.riojatracker.com',
  'bt.citymore.com',
  'ukbkvcd.sladinki007.net',
  'd-c-t.ath.cx',
  'trackerenator.minitalk.net',
  'centraldownload.mine.nu',
  'vtv2.sladinki007.net',
  'tracker.cnxp.com',
  'www.hashish.ath.cx',
  'tlfbt.3322.org',
  'vtv.sladinki007.net',
  'els.ath.cx',
  'tracker.minitalk.net',
  'eztv.sladinki007.eu',
  'www.escom.biz',
  'bt.romman.net',
  'bugz.sladinki007.net',
  'tftracker.kicks-ass.org',
  'www.ardent.tv',
  'neontorrents.org',
  'tracker.btminer.com',
  'tracker.toptorrents.org',
  'root-torrents.to',
  'tracker.denness.net',
  'kid.sladinki007.net',
  'tracker.bitnova.info',
  'bandit.ukb-kvcd.com',
  'torrent-downloads.deants.com',
  'up2p.3322.org',
  'share.dmhy.net',
  'tv.sladinki007.net',
  'power-mp3-world.ath.cx',
  'anderssons.ath.cx',
  'wreckingcrew.hopto.org',
  'porn.sladinki007.net',
  'gamebt.ali213.net',
  'axxo.sladinki007.net',
  'eztv.sladinki007.net',
  'gauss.indymedia.org',
  'tracker.reprobate.se',
  'bittorrent.dyndns.org',
  'tracker.bitenova.nl',
  'tracker2.bt-chat.com',
  'tk2.greedland.net',
  'tracker.bitcomet.net',
  'tracker.bt-chat.com',
  'tracker.sladinki007.net',
  'tracker.ydy.com',
  'www.torrentrealm.com'
]

module.exports = new (require('ipc-service').Service)()

module.exports.setup = function() {
  this.config({
    'recentPoolMaxSize': 250,
    'poolMinSize': -1,
    'runInterval': CommandLineHelpers.config.tracker.interval,
    'appspace': 'onblacksails.',
    'id': 'tracker',
    'retry': CommandLineHelpers.config.tracker.retry,
    'silent': CommandLineHelpers.config.tracker.silent,
    'networkHost': CommandLineHelpers.config.tracker.host,
    'networkPort': CommandLineHelpers.config.tracker.port,
    'path': CommandLineHelpers.config.datapath,
    'onempty': CommandLineHelpers.config.tracker.onempty
  })

  this.totalResponses = 0
  this.announce = []
  var self = this
  self._stats['urls-in-blacklist'] = 0
  self._stats['no-valid-announce'] = 0
  self._stats['items-updated'] = 0
  self._stats['items-update-error'] = 0
  self._stats['items-dead-removed'] = 0
  self._stats['items-not-found'] = 0
  self._stats['items-found'] = 0
  self._stats['items-received'] = 0
  self._isEmptyBusy = false
  self._workingPool = []

  self.on('process', function(item) {
    self.updatePeersOf(item)
  })

  self.on('empty', function() {
    if (!self._isEmptyBusy) {
      if (self.config('onempty') != false) {
        self._isEmptyBusy = true
        ServiceQueueModel.runOnce(self.config('onempty'), function () {
          self._isEmptyBusy = false
        })
      }
    }
  })
}

module.exports.getProperAnnounceUrls = function (trackers) {
  var announceUrls = [],
    properFound = false,
    self = this

  if (this.totalResponses > 100) {
    var candidate = null,
      candidateUrl = ''

    for (var i in trackers) {
      if (typeof this.announce[trackers[i]] !== "undefined") {
        var item = this.announce[trackers[i]]
        if (!item['active']) {
          if (candidate == null || candidate['last-request'] > item['last-request']) {
            candidate = item
            candidateUrl = trackers[i]
          }
        } else {
          //check for timeouts: 15s if there was  no previous timeout, 30s for second timeout, 45s for third, etc.
          if ((new Date().getTime()) - item['last-request'] > (15000 * (item['timeouts'] + 1))) {
            this.announce[trackers[i]]['timeouts']++
            this.announce[trackers[i]]['active'] = false
            this.announce[trackers[i]]['last-request'] = new Date().getTime()
          }
        }
      }
    }
    if (candidate != null) {
      properFound = true
      announceUrls.push(candidateUrl)
      this.announce[candidateUrl]['active'] = true
      this.announce[candidateUrl]['requests']++
      this.announce[candidateUrl]['last-request'] = new Date().getTime()
    }
  }

  if (!properFound) {
    for (var i in trackers) {
      var tracker_i = trackers[i].toLowerCase()
      if (tracker_i.indexOf('dht://') == -1 && tracker_i.indexOf('https://') == -1) {
        if (!this.isInBlacklist(tracker_i)) {
          announceUrls.push(tracker_i)
        } else {
          ++self._stats['urls-in-blacklist']
        }
      }
    }
  }

  if (announceUrls.length == 0) {
    ++self._stats['no-valid-announce']
  }

  return announceUrls
}

module.exports.registerAnnounceResponse = function (url) {
  var item = this.announce[url] || JSON.parse(JSON.stringify(rawAnnounceItem))
  item['active'] = false
  item['responses']++
  item['last-response'] = new Date().getTime()
  if (this.totalResponses <= 100) {
    item['requests'] = item['responses']
    item['last-request'] = item['last-response']
  }

  this.announce[url] = item
  ++this.totalResponses
}

function ignore(err) {
  //console.log("ERROR: " + err.message)
}

module.exports.updatePeersOf = function(hash) {
  var self = this

  ++self._stats['items-received']

  Hash.find()
    .where({ uuid: hash })
    .limit(1)
    .exec(function(err, entries) {
      if (!err && entries.length) {
        ++self._stats['items-found']
        var peerId = new Buffer('01234567890123456789'),
          port = 6881,
          data = { announce: self.getProperAnnounceUrls(entries[0].trackers), infoHash: entries[0].uuid }

        if (data.announce.length) {
          self._addToWorkingPool(entries[0].uuid)
          var client = new TrackerClient(peerId, port, data)
          client.on('error', ignore)
          client.once('update', function (res) {
            ++self._stats['items-processed']
            self._removeFromWorkingPool(entries[0].uuid)
            self.registerAnnounceResponse(res.announce)
            if (res.complete == 0 && CommandLineHelpers.config.removedead) {
              //Remove dead torrent
              HashHelpers.remove(entries[0].uuid)
              ++self._stats['items-dead-removed']
            } else {
              Hash.update({ uuid: entries[0].uuid }, {
                seeders: res.complete,
                leechers: res.incomplete,
                updatedAt: entries[0].updatedAt,
                peersUpdatedAt: new Date(),
                updatedBy: CommandLineHelpers.config.clusterid
              }, function (uErr, hashes) {
                if (!uErr) {
                  ++self._stats['items-updated']
                } else {
                  ++self._stats['items-update-error']
                  console.log("(TRACKER) UPDATE ERROR! " + entries[0].uuid)
                  console.log(uErr)
                }
              })
            }
            client.stop()
            client = null
          })
          client.update()
        }
      } else {
        ++self._stats['items-not-found']
        console.log("(TRACKER) Item not found! " + hash)
        console.log(err)
      }
    })
}

module.exports.getAnnounce = function() {
  var returnValue = {}
  var keys = Object.keys(this.announce)
  for (key in keys) {
    returnValue[keys[key]] = this.announce[keys[key]]
  }
  return returnValue
}

module.exports.isInBlacklist = function(url) {
  var blacklisted = false
  for (key in blacklistPatterns) {
    if (url.indexOf(blacklistPatterns[key]) != -1) {
      blacklisted = true
      break
    }
  }
  return blacklisted
}

module.exports._addToWorkingPool = function(uuid) {
  var self = this, index = self._workingPool.indexOf(uuid);

  if (index == -1) {
    self._workingPool.unshift(uuid)
    if (self._workingPool.length > 6) {
      var retry = self._workingPool.splice(-3)
      for (var i in retry) {
        console.log("(TRACKER) RETRY: " + retry[i])
        self.queue(retry[i], false, true)
      }
    }
    self._stats['working-pool'] = self._workingPool.length
  } else {
    console.log("\t(TRACKER) ALREADY PRESENT IN WORKING POOL! " + uuid)
  }

}


module.exports._removeFromWorkingPool = function(uuid) {
  var self = this, index = self._workingPool.indexOf(uuid);

  if (index > -1) {
    self._workingPool.splice(index, 1);
    self._stats['working-pool'] = self._workingPool.length
  }
}