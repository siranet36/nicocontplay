# nicocontplay
ニコ生継続プレイ

## Overview

google chrome の拡張機能として以下の機能を提供します。  
ニコ生の生放送を開いている状態で、そのコミュニティで次枠の放送が始まったときに、その次枠に移動します。  
この拡張機能をインストールした後に開いた生放送から適用されます。

(ニコ生 http://live.nicovideo.jp/)

## Description

簡単に説明すると、以下のような動作をします。  

(1)生放送のページを開いたときの処理  
　開いたタブのURLがニコ生のURLの場合、連想配列にそのURLを保存。

(2)枠移動があったかどうか一定間隔(1分おき)に調べる  
　(1)で保存したURLについて以下を行う  
　　保存したURLに対応するコミュニティのURLを取得。  
　　コミュニティのURLが取得できたら、YQLを利用してコミュニティのページから生放送中のURLを取得。  
　　開いているURLと生放送中のURLの放送番号が不一致の場合、新たな枠が開いたと判断して 生放送中のURLを開く。  

## 履歴

1.0.1 bugfix.  
1.0.2 bugfix.  
1.0.3 change timeout value.  
